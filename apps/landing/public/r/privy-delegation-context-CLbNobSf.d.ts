type PrivyDelegationContextValue = {
    start: (input: {
        state: string;
        signerId: string;
    }) => Promise<void>;
};
declare function usePrivyDelegation(): PrivyDelegationContextValue;

export { type PrivyDelegationContextValue as P, usePrivyDelegation as u };
