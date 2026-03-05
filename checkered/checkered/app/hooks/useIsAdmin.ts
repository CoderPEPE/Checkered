import { useAccount, useReadContract } from "wagmi";
import { TOURNAMENT_ADDRESS, TOURNAMENT_ABI } from "../contracts";

/**
 * Checks whether the connected wallet has ADMIN_ROLE on the tournament contract.
 * Returns { isAdmin, isLoading }.
 */
export function useIsAdmin() {
  const { address, isConnected } = useAccount();

  // Step 1: read the ADMIN_ROLE bytes32 value
  const { data: adminRole } = useReadContract({
    address: TOURNAMENT_ADDRESS,
    abi: TOURNAMENT_ABI,
    functionName: "ADMIN_ROLE",
    query: { enabled: isConnected },
  });

  // Step 2: check if the connected wallet has that role
  const { data: hasAdmin, isLoading } = useReadContract({
    address: TOURNAMENT_ADDRESS,
    abi: TOURNAMENT_ABI,
    functionName: "hasRole",
    args: adminRole && address ? [adminRole, address] : undefined,
    query: { enabled: !!adminRole && !!address },
  });

  return {
    isAdmin: !!hasAdmin,
    isLoading,
  };
}
