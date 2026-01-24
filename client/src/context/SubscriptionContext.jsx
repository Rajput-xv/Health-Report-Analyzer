import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await api.get('/payments/subscription');
      setSubscription(response.data);
    } catch (error) {
      setSubscription(null);
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ subscription, fetchSubscription, setSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};