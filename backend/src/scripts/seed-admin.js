/**
 * Seed Admin Users
 * Run with: node src/scripts/seed-admin.js
 */

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@agentictrust.app';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminName = process.env.ADMIN_NAME || 'System Admin';

    try {
        // Check if admin already exists
        const existing = await prisma.adminUser.findUnique({
            where: { email: adminEmail }
        });

        if (existing) {
            console.log(`Admin user already exists: ${adminEmail}`);
            return existing;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const admin = await prisma.adminUser.create({
            data: {
                email: adminEmail,
                passwordHash,
                name: adminName,
                role: 'superadmin',
                isActive: true
            }
        });

        console.log(`Created admin user: ${admin.email} (${admin.role})`);
        console.log('Default password:', adminPassword);
        console.log('\nIMPORTANT: Change this password immediately in production!');

        return admin;
    } catch (error) {
        console.error('Failed to seed admin:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    seedAdmin()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { seedAdmin };
