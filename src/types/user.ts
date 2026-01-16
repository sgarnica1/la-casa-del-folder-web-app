export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export type UserRoleType = UserRole.ADMIN | UserRole.CUSTOMER;
