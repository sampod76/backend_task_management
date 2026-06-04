import {
  AccountType,
  RecordStatus,
  UserRole,
} from '../../../src/generated/prisma/enums';
import { Prisma } from '../../../src/generated/prisma/client';
import { hashPassword } from '../helpers/password.helper';

type AdminUserSeed = {
  email: string;
  username: string;
  password: string;
  role: typeof UserRole.admin;
  accountType: typeof AccountType.custom;
  status: typeof RecordStatus.active;
  isEmailVerified: boolean;
  admin: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
  };
};

const adminUsers: AdminUserSeed[] = [
  {
    email: 'admin@gmail.com',
    username: 'admin_one',
    password: '11223344',
    role: UserRole.admin,
    accountType: AccountType.custom,
    status: RecordStatus.active,
    isEmailVerified: true,
    admin: {
      firstName: 'John',
      lastName: 'Doe',
      phone: '01700000000',
      address: 'Dhaka, Bangladesh',
    },
  },
  {
    email: 'nariaitsolution@gmail.com',
    username: 'naria_admin',
    password: '11223344',
    role: UserRole.admin,
    accountType: AccountType.custom,
    status: RecordStatus.active,
    isEmailVerified: true,
    admin: {
      firstName: 'Naria',
      lastName: 'IT',
      phone: '01711111111',
      address: 'Bangladesh',
    },
  },
];

export async function seedAdminUsers(
  tx: Prisma.TransactionClient,
): Promise<void> {
  for (const seedUser of adminUsers) {
    const hashedPassword = await hashPassword(seedUser.password);

    await tx.user.upsert({
      where: { email: seedUser.email },
      create: {
        email: seedUser.email,
        username: seedUser.username,
        password: hashedPassword,
        role: seedUser.role,
        accountType: seedUser.accountType,
        status: seedUser.status,
        isEmailVerified: seedUser.isEmailVerified,
        admin: {
          create: {
            firstName: seedUser.admin.firstName,
            lastName: seedUser.admin.lastName,
            phone: seedUser.admin.phone,
            address: seedUser.admin.address,
            status: seedUser.status,
          },
        },
      },
      update: {
        username: seedUser.username,
        password: hashedPassword,
        role: seedUser.role,
        accountType: seedUser.accountType,
        status: seedUser.status,
        isEmailVerified: seedUser.isEmailVerified,
        deletedAt: null,
        admin: {
          upsert: {
            create: {
              firstName: seedUser.admin.firstName,
              lastName: seedUser.admin.lastName,
              phone: seedUser.admin.phone,
              address: seedUser.admin.address,
              status: seedUser.status,
            },
            update: {
              firstName: seedUser.admin.firstName,
              lastName: seedUser.admin.lastName,
              phone: seedUser.admin.phone,
              address: seedUser.admin.address,
              status: seedUser.status,
              deletedAt: null,
            },
          },
        },
      },
    });
  }
}
