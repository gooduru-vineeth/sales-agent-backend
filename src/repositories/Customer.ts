import Customer from '../models/Customer';
import { Customer as CustomerType } from '../types/customer';

export const createCustomer = async (
  customer: CustomerType
): Promise<CustomerType> => {
  return await Customer.create(customer);
};

export const getCustomerBySessionId = async (
  sessionId: string
): Promise<CustomerType | null> => {
  return await Customer.findOne({ sessionId });
};

export const saveCustomer = async (
  customer: CustomerType
): Promise<CustomerType | null> => {
  return await Customer.findOneAndUpdate(
    { sessionId: customer.sessionId },
    customer,
    {
      new: true,
      upsert: true,
    }
  );
};

export const updateCustomer = async (
  sessionId: string,
  customer: CustomerType
): Promise<CustomerType | null> => {
  return await Customer.findOneAndUpdate({ sessionId }, customer, {
    new: true,
  });
};
