import { reactive, computed } from 'vue';
import { useInfiniteQuery } from 'vue-query';
import { UseInfiniteQueryOptions } from 'react-query/types';

import QUERY_KEYS from '@/constants/queryKeys';
import { POOLS } from '@/constants/pools';

import { balancerSubgraphService } from '@/services/balancer/subgraph/balancer-subgraph.service';
import { PoolActivity } from '@/services/balancer/subgraph/types';
import useWeb3 from '@/services/web3/useWeb3';
import useNetwork from '../useNetwork';
import { beethovenxService } from '@/beethovenx/services/beethovenx/beethovenx.service';
import { GqlBalancerPoolActivity } from '@/beethovenx/services/beethovenx/beethovenx-types';

type UserPoolActivitiesQueryResponse = {
  poolActivities: GqlBalancerPoolActivity[];
  skip?: number;
};

export default function usePoolUserActivitiesQuery(
  id: string,
  options: UseInfiniteQueryOptions<UserPoolActivitiesQueryResponse> = {}
) {
  // COMPOSABLES
  const { account, isWalletReady } = useWeb3();
  const { networkId } = useNetwork();

  // COMPUTED
  const enabled = computed(() => isWalletReady.value && account.value != null);

  // DATA
  const queryKey = reactive(
    QUERY_KEYS.Pools.UserActivities(networkId, id, account)
  );

  // METHODS
  const queryFn = async ({ pageParam = 0 }) => {
    const poolActivities = await beethovenxService.getBalancerPoolActivities({
      poolId: id,
      first: POOLS.Pagination.PerPage,
      skip: pageParam,
      sender: account.value.toLowerCase()
    });

    return {
      poolActivities,
      skip:
        poolActivities.length >= POOLS.Pagination.PerPage
          ? pageParam + POOLS.Pagination.PerPage
          : undefined
    };
  };

  const queryOptions = reactive({
    enabled,
    getNextPageParam: (lastPage: UserPoolActivitiesQueryResponse) =>
      lastPage.skip,
    ...options
  });

  return useInfiniteQuery<UserPoolActivitiesQueryResponse>(
    queryKey,
    queryFn,
    queryOptions
  );
}
