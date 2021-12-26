import { reactive } from 'vue';
import { useQuery } from 'vue-query';
import { QueryObserverOptions } from 'react-query/core';
import QUERY_KEYS from '@/beethovenx/constants/queryKeys';
import useWeb3 from '@/services/web3/useWeb3';
import { balancerSubgraphService } from '@/services/balancer/subgraph/balancer-subgraph.service';
import { masterChefContractsService } from '@/beethovenx/services/farm/master-chef-contracts.service';
import {
  FullPool,
  Pool,
  SubgraphBalancer
} from '@/services/balancer/subgraph/types';

interface ProtocolData extends SubgraphBalancer {
  beetsPrice: number;
  circulatingSupply: number;
}

export default function useProtocolDataQuery(
  options: QueryObserverOptions<ProtocolData> = {}
) {
  const { appNetworkConfig } = useWeb3();

  const queryFn = async () => {
    const pools = await balancerSubgraphService.pools.get();
    const beetsPool = pools.find(
      pool =>
        pool.id ===
        appNetworkConfig.addresses.beetsUsdcReferencePricePool.toLowerCase()
    );

    if (!beetsPool) {
      throw new Error('Could not load beets reference price pool');
    }

    const balancerData = await balancerSubgraphService.balancers.get();
    const beetsPrice = await getBeetsPrice(
      beetsPool,
      appNetworkConfig.addresses.beets,
      appNetworkConfig.addresses.usdc
    );

    console.log('beets price', beetsPrice);

    const circulatingSupply = await masterChefContractsService.beethovenxToken.getCirculatingSupply();

    return {
      ...balancerData,
      beetsPrice,
      circulatingSupply
    };
  };

  const queryOptions = reactive({
    enabled: true,
    ...options
  });

  return useQuery<ProtocolData>(
    QUERY_KEYS.ProtocolData.All,
    queryFn,
    queryOptions
  );
}

export async function getBeetsPrice(
  beetsPool: Pool,
  beetsAddress: string,
  usdcAddress: string
) {
  const beets = beetsPool.tokens.find(
    token => token.address.toLowerCase() === beetsAddress.toLowerCase()
  );
  const usdc = beetsPool.tokens.find(
    token => token.address.toLowerCase() === usdcAddress.toLowerCase()
  );

  if (!beets || !usdc) {
    return 0;
  }

  return (
    ((parseFloat(beets.weight) / parseFloat(usdc.weight)) *
      parseFloat(usdc.balance)) /
    parseFloat(beets.balance)
  );
}
