// apps/api-gateway/src/routes/admin.ts

import { Elysia, t } from 'elysia';
import { prisma } from 'db/client';

// ⚠️ ONLY USE THIS ONCE TO CREATE FIRST ADMIN
// THEN DELETE THIS FILE OR DISABLE THE ENDPOINT

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';

export const adminSetupRoutes = new Elysia({ prefix: '/admin' })
  
  /**
   * POST /admin/setup - Create first superadmin (ONE-TIME USE)
   * ⚠️ Delete this endpoint after creating your first admin!
   */
  .post('/setup', async ({ body }) => {
    // Verify secret
    if (body.secret !== ADMIN_SECRET) {
      throw new Error('Invalid admin secret');
    }
    
    // Check if any admins exist
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'SUPERADMIN'] },
      },
    });
    
    if (existingAdmin) {
      throw new Error('Admin already exists. This endpoint is disabled.');
    }
    
    // Promote user to superadmin
    const user = await prisma.user.update({
      where: { email: body.email },
      data: { role: 'SUPERADMIN' },
    });
    
    console.log(`✅ First superadmin created: ${user.username}`);
    
    return {
      success: true,
      message: 'Superadmin created. Delete this endpoint now!',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }, {
    body: t.Object({
      email: t.String(),
      secret: t.String(),
    }),
  });