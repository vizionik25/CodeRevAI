import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import Stripe from 'stripe';

const mocks = vi.hoisted(() => ({
    constructEvent: vi.fn(),
    sessionCreate: vi.fn(),
    clerkUpdateMetadata: vi.fn(),
}));

// Mock dependencies
vi.mock('@/app/utils/apiClients', () => ({
    getStripe: vi.fn(() => ({
        webhooks: {
            constructEvent: mocks.constructEvent,
        },
        billingPortal: {
            sessions: {
                create: mocks.sessionCreate,
            },
        },
    })),
}));

vi.mock('@/app/lib/prisma', () => ({
    prisma: {
        userSubscription: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('@clerk/nextjs/server', () => ({
    clerkClient: vi.fn(() => Promise.resolve({
        users: {
            updateUserMetadata: mocks.clerkUpdateMetadata,
        },
    })),
}));

vi.mock('@/app/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@/app/config/env', () => ({
    serverEnv: {
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
        STRIPE_PRICE_ID_PRO: 'price_test_pro',
    },
}));

import { getStripe } from '@/app/utils/apiClients';
import { prisma } from '@/app/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

describe('Stripe Webhook Handler', () => {
    let mockPrisma: any;
    let mockClerk: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = prisma;
        mockClerk = clerkClient;
    });

    const createMockRequest = (body: string, signature: string = 'valid_signature'): NextRequest => {
        return {
            text: vi.fn().mockResolvedValue(body),
            headers: {
                get: vi.fn((name: string) => {
                    if (name === 'stripe-signature') return signature;
                    return null;
                }),
            },
        } as any;
    };

    describe('checkout.session.completed', () => {
        it('should create subscription and update Clerk metadata on successful checkout', async () => {
            const mockSession: Partial<Stripe.Checkout.Session> = {
                id: 'cs_test_123',
                customer: 'cus_test_123',
                subscription: 'sub_test_123',
                metadata: {
                    userId: 'user_123',
                    plan: 'pro',
                },
            };

            const mockEvent: Partial<Stripe.Event> = {
                type: 'checkout.session.completed',
                data: {
                    object: mockSession as Stripe.Checkout.Session,
                },
            } as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.upsert.mockResolvedValue({});

            const mockClerkInstance = await mockClerk();
            mockClerkInstance.users.updateUserMetadata.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
            expect(mockPrisma.userSubscription.upsert).toHaveBeenCalledWith({
                where: { userId: 'user_123' },
                update: expect.objectContaining({
                    stripeCustomerId: 'cus_test_123',
                    stripeSubscriptionId: 'sub_test_123',
                    plan: 'pro',
                    status: 'active',
                }),
                create: expect.objectContaining({
                    userId: 'user_123',
                    stripeCustomerId: 'cus_test_123',
                    stripeSubscriptionId: 'sub_test_123',
                    plan: 'pro',
                    status: 'active',
                }),
            });
            expect(mocks.clerkUpdateMetadata).toHaveBeenCalledWith('user_123', {
                publicMetadata: { plan: 'pro' },
            });
        });

        it('should handle missing metadata gracefully', async () => {
            const mockSession: Partial<Stripe.Checkout.Session> = {
                id: 'cs_test_123',
                customer: 'cus_test_123',
                subscription: 'sub_test_123',
                metadata: {}, // Missing userId and plan
            };

            const mockEvent: Partial<Stripe.Event> = {
                type: 'checkout.session.completed',
                data: {
                    object: mockSession as Stripe.Checkout.Session,
                },
            } as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.upsert).not.toHaveBeenCalled();
        });
    });

    describe('customer.subscription.created', () => {
        it('should update existing subscription for known customer', async () => {
            const mockSubscription = {
                id: 'sub_test_123',
                customer: 'cus_test_123',
                status: 'active',
                current_period_start: 1700000000,
                current_period_end: 1702592000,
                cancel_at_period_end: false,
                items: {
                    data: [
                        {
                            price: {
                                id: 'price_test_pro',
                            } as Stripe.Price,
                        } as Stripe.SubscriptionItem,
                    ],
                } as Stripe.ApiList<Stripe.SubscriptionItem>,
            } as unknown as Stripe.Subscription;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.subscription.created',
                data: {
                    object: mockSubscription as Stripe.Subscription,
                },
            } as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);

            // First findUnique for idempotency check
            mockPrisma.userSubscription.findUnique
                .mockResolvedValueOnce(null)
                // Second findUnique for customer lookup
                .mockResolvedValueOnce({
                    id: 1,
                    userId: 'user_123',
                    stripeCustomerId: 'cus_test_123',
                });

            mockPrisma.userSubscription.update.mockResolvedValue({});

            const mockClerkInstance = await mockClerk();
            mockClerkInstance.users.updateUserMetadata.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    stripeSubscriptionId: 'sub_test_123',
                    stripePriceId: 'price_test_pro',
                    status: 'active',
                    plan: 'pro',
                    cancelAtPeriodEnd: false,
                }),
            });
        });

        it('should handle idempotency - skip if already processed', async () => {
            const mockSubscription: Partial<Stripe.Subscription> = {
                id: 'sub_test_123',
                customer: 'cus_test_123',
            } as unknown as Stripe.Subscription;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.subscription.created',
                data: {
                    object: mockSubscription as unknown as Stripe.Subscription,
                },
            } as unknown as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.findUnique.mockResolvedValueOnce({
                id: 1,
                stripeSubscriptionId: 'sub_test_123',
            });

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).not.toHaveBeenCalled();
        });
    });

    describe('customer.subscription.updated', () => {
        it('should update subscription status and plan', async () => {
            const mockSubscription: Partial<Stripe.Subscription> = {
                id: 'sub_test_123',
                customer: 'cus_test_123',
                status: 'active',
                current_period_start: 1700000000,
                current_period_end: 1702592000,
                cancel_at_period_end: false,
                items: {
                    data: [
                        {
                            price: {
                                id: 'price_test_pro',
                            } as unknown as Stripe.Price,
                        } as unknown as Stripe.SubscriptionItem,
                    ],
                } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
            } as unknown as Stripe.Subscription;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.subscription.updated',
                data: {
                    object: mockSubscription as unknown as Stripe.Subscription,
                },
            } as unknown as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.findUnique.mockResolvedValue({
                id: 1,
                userId: 'user_123',
            });
            mockPrisma.userSubscription.update.mockResolvedValue({});

            const mockClerkInstance = await mockClerk();
            mockClerkInstance.users.updateUserMetadata.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).toHaveBeenCalled();
            expect(mocks.clerkUpdateMetadata).toHaveBeenCalledWith('user_123', {
                publicMetadata: { plan: 'pro' },
            });
        });
    });

    describe('customer.subscription.deleted', () => {
        it('should set subscription to free and status to canceled', async () => {
            const mockSubscription: Partial<Stripe.Subscription> = {
                id: 'sub_test_123',
                customer: 'cus_test_123',
            } as unknown as Stripe.Subscription;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'customer.subscription.deleted',
                data: {
                    object: mockSubscription as unknown as Stripe.Subscription,
                },
            } as unknown as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.findUnique.mockResolvedValue({
                id: 1,
                userId: 'user_123',
            });
            mockPrisma.userSubscription.update.mockResolvedValue({});

            const mockClerkInstance = await mockClerk();
            mockClerkInstance.users.updateUserMetadata.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    status: 'canceled',
                    plan: 'free',
                }),
            });
            expect(mocks.clerkUpdateMetadata).toHaveBeenCalledWith('user_123', {
                publicMetadata: { plan: 'free' },
            });
        });
    });

    describe('invoice.payment_succeeded', () => {
        it('should ensure subscription is active after payment', async () => {
            const mockInvoice = {
                id: 'in_test_123',
                customer: 'cus_test_123',
                amount_paid: 2000,
                subscription: 'sub_test_123',
                lines: {
                    data: [
                        {
                            price: {
                                id: 'price_test_pro',
                            } as unknown as Stripe.Price,
                        } as unknown as Stripe.InvoiceLineItem,
                    ],
                } as unknown as Stripe.ApiList<Stripe.InvoiceLineItem>,
            } as unknown as Stripe.Invoice;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'invoice.payment_succeeded',
                data: {
                    object: mockInvoice as unknown as Stripe.Invoice,
                },
            } as unknown as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.findUnique.mockResolvedValue({
                id: 1,
                userId: 'user_123',
            });
            mockPrisma.userSubscription.update.mockResolvedValue({});

            const mockClerkInstance = await mockClerk();
            mockClerkInstance.users.updateUserMetadata.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    status: 'active',
                    plan: 'pro',
                }),
            });
        });
    });

    describe('invoice.payment_failed', () => {
        it('should set subscription status to past_due', async () => {
            const mockInvoice = {
                id: 'in_test_123',
                customer: 'cus_test_123',
                amount_due: 2000,
                subscription: 'sub_test_123',
            } as unknown as Stripe.Invoice;

            const mockEvent: Partial<Stripe.Event> = {
                type: 'invoice.payment_failed',
                data: {
                    object: mockInvoice as unknown as Stripe.Invoice,
                },
            } as unknown as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.findUnique.mockResolvedValue({
                id: 1,
                userId: 'user_123',
            });
            mockPrisma.userSubscription.update.mockResolvedValue({});

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    status: 'past_due',
                }),
            });
        });
    });

    describe('Error Handling', () => {
        it('should return 400 for missing stripe-signature header', async () => {
            const req = createMockRequest('{}', '');

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBeDefined();
        });

        it('should return 400 for invalid signature', async () => {
            mocks.constructEvent.mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            const req = createMockRequest('{}', 'invalid_signature');
            const response = await POST(req);

            expect(response.status).toBe(400);
        });

        it('should return 500 for database errors', async () => {
            const mockSession: Partial<Stripe.Checkout.Session> = {
                id: 'cs_test_123',
                customer: 'cus_test_123',
                subscription: 'sub_test_123',
                metadata: {
                    userId: 'user_123',
                    plan: 'pro',
                },
            };

            const mockEvent: Partial<Stripe.Event> = {
                type: 'checkout.session.completed',
                data: {
                    object: mockSession as Stripe.Checkout.Session,
                },
            } as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);
            mockPrisma.userSubscription.upsert.mockRejectedValue(new Error('Database error'));

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(500);
        });

        it('should handle unhandled event types gracefully', async () => {
            const mockEvent: Partial<Stripe.Event> = {
                type: 'payment_intent.succeeded' as any,
                data: {
                    object: {} as any,
                },
            } as Stripe.Event;

            mocks.constructEvent.mockReturnValue(mockEvent);

            const req = createMockRequest(JSON.stringify(mockEvent));
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ received: true });
        });
    });
});
