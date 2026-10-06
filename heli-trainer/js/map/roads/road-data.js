import {
  OZETI_PLAYABLE_BOUNDS
} from '../map-data.js?v=88';

/*
 * v87 complete road pass for the recovered playable Ozeti crop.
 *
 * Primary arterials remain hand-traced against the tactical reference.
 * Local streets are vectorized from road-colour / ridge responses in the
 * same tactical image, skeletonized, simplified, converted through the
 * authoritative tactical affine calibration, and clipped to playable bounds.
 *
 * No legacy crop-local PRIMARY_ROADS / SECONDARY_ROADS data is used.
 */

const WEST_EAST_POINTS=Object.freeze([
  [5758.0,5063.8],[6053.4,5404.6],[6023.7,5924.7],[6122.0,6085.8],
  [6444.2,6189.1],[6909.7,6213.8],[7234.5,6177.0],[7658.3,6261.3],
  [7925.6,6043.8],[8332.1,5967.8],[8612.7,6130.7],[8979.1,6034.3],
  [10781.9,6032.2],[10947.6,5833.7],[11187.7,5996.3],[11410.5,5998.5],
  [11722.3,5561.3],[11906.4,5463.0],[12271.0,5466.7],[12373.0,5427.6],
  [12614.5,5510.1],[13101.0,5495.0],[13281.0,5616.8],[13380.8,5697.9],
  [13538.5,5939.7],[13994.1,6504.6],[14307.0,6532.5]
]);

const NORTH_POINTS=Object.freeze([
  [6909.7,6213.8],[7046.3,6495.4],[7264.4,6757.7],[7215.1,7237.6],
  [7374.6,7379.3],[7536.6,7380.9],[7576.0,7441.4],[7513.0,7560.8],
  [7607.4,7942.1],[7542.6,8161.6],[7698.8,8483.4],[8236.8,8969.1],
  [8430.9,9431.4],[8530.7,9512.5],[8912.2,9696.4],[8973.0,9956.0]
]);

const LOCAL_PATHS=Object.freeze([
  Object.freeze({id:'ozeti-local-001',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8479.7,5649.0],[8480.8,5589.0]])}),
  Object.freeze({id:'ozeti-local-002',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12648.1,5890.7],[12647.7,5910.8],[12627.8,5890.5]])}),
  Object.freeze({id:'ozeti-local-003',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6867.5,7414.3],[6887.8,7414.5],[6867.9,7394.3]])}),
  Object.freeze({id:'ozeti-local-004',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8174.8,7927.7],[8114.0,7927.1]])}),
  Object.freeze({id:'ozeti-local-005',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9317.8,5237.0],[9339.1,5177.2]])}),
  Object.freeze({id:'ozeti-local-006',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8844.3,5652.6],[8824.0,5652.4],[8844.6,5632.6]])}),
  Object.freeze({id:'ozeti-local-007',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8104.8,5104.8],[8084.9,5084.6],[8105.2,5084.8]])}),
  Object.freeze({id:'ozeti-local-008',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8459.2,3447.1],[8459.9,3407.1]])}),
  Object.freeze({id:'ozeti-local-009',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9332.2,3335.7],[9312.0,3335.5],[9331.9,3355.7]])}),
  Object.freeze({id:'ozeti-local-010',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12290.3,6627.7],[12289.6,6667.8]])}),
  Object.freeze({id:'ozeti-local-011',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11249.4,4836.0],[11270.0,4816.2],[11249.8,4816.0]])}),
  Object.freeze({id:'ozeti-local-012',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6895.2,8115.1],[6894.5,8155.1]])}),
  Object.freeze({id:'ozeti-local-013',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6895.2,8115.1],[6875.3,8094.9],[6895.6,8095.1]])}),
  Object.freeze({id:'ozeti-local-014',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6895.2,8115.1],[6915.9,8095.3],[6895.6,8095.1]])}),
  Object.freeze({id:'ozeti-local-015',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8781.7,5752.1],[8761.8,5731.9]])}),
  Object.freeze({id:'ozeti-local-016',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8781.7,5752.1],[8842.5,5752.7]])}),
  Object.freeze({id:'ozeti-local-017',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7161.4,7957.6],[7039.9,7956.4]])}),
  Object.freeze({id:'ozeti-local-018',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8437.7,7950.3],[8417.1,7970.1],[8417.5,7950.1]])}),
  Object.freeze({id:'ozeti-local-019',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8437.7,7950.3],[8457.6,7970.6],[8458.0,7950.5]])}),
  Object.freeze({id:'ozeti-local-020',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9160.2,2773.6],[9099.4,2773.0]])}),
  Object.freeze({id:'ozeti-local-021',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9160.2,2773.6],[9180.8,2753.8]])}),
  Object.freeze({id:'ozeti-local-022',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8634.2,7171.7],[8654.9,7151.9],[8634.6,7151.7]])}),
  Object.freeze({id:'ozeti-local-023',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9335.4,7599.0],[9334.3,7659.1]])}),
  Object.freeze({id:'ozeti-local-024',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7803.3,8304.3],[7823.2,8324.5],[7802.9,8324.3]])}),
  Object.freeze({id:'ozeti-local-025',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7250.2,5316.5],[7248.7,5396.5]])}),
  Object.freeze({id:'ozeti-local-026',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7250.2,5316.5],[7270.8,5296.7],[7250.5,5296.5]])}),
  Object.freeze({id:'ozeti-local-027',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8185.8,5105.7],[8205.7,5125.9],[8206.1,5105.9]])}),
  Object.freeze({id:'ozeti-local-028',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7133.9,8357.7],[7174.4,8358.1]])}),
  Object.freeze({id:'ozeti-local-029',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11838.9,6943.5],[11879.4,6943.9]])}),
  Object.freeze({id:'ozeti-local-030',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7295.4,7278.4],[7316.0,7258.6],[7457.8,7260.0],[7478.4,7240.2]])}),
  Object.freeze({id:'ozeti-local-031',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12420.9,6128.7],[12400.7,6128.5],[12420.6,6148.7]])}),
  Object.freeze({id:'ozeti-local-032',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6370.1,8029.8],[6451.1,8030.6]])}),
  Object.freeze({id:'ozeti-local-033',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7477.9,3937.7],[7478.6,3897.7]])}),
  Object.freeze({id:'ozeti-local-034',class:'local',width:6.5,centerLine:false,points:Object.freeze([[13525.2,5559.2],[13565.7,5559.6]])}),
  Object.freeze({id:'ozeti-local-035',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9543.1,5099.2],[9502.2,5118.8]])}),
  Object.freeze({id:'ozeti-local-036',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8574.6,7111.1],[8493.6,7110.3]])}),
  Object.freeze({id:'ozeti-local-037',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7400.7,7059.3],[7380.8,7039.1],[7401.0,7039.3]])}),
  Object.freeze({id:'ozeti-local-038',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7499.0,7220.4],[7539.5,7220.8]])}),
  Object.freeze({id:'ozeti-local-039',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7499.0,7220.4],[7479.1,7200.2],[7478.7,7220.2]])}),
  Object.freeze({id:'ozeti-local-040',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9027.3,5614.4],[9006.7,5634.2],[8925.7,5633.4]])}),
  Object.freeze({id:'ozeti-local-041',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8340.6,3285.8],[8339.8,3325.8]])}),
  Object.freeze({id:'ozeti-local-042',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12417.4,7429.6],[12437.3,7449.8],[12417.4,7429.6]])}),
  Object.freeze({id:'ozeti-local-043',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12417.4,7429.6],[12420.0,7289.5]])}),
  Object.freeze({id:'ozeti-local-044',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11540.9,6620.3],[11521.1,6600.0],[11520.7,6620.1]])}),
  Object.freeze({id:'ozeti-local-045',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9238.2,5156.2],[9236.4,5256.2]])}),
  Object.freeze({id:'ozeti-local-046',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8011.6,4663.6],[8133.1,4664.8]])}),
  Object.freeze({id:'ozeti-local-047',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8361.9,3226.0],[8383.6,3146.1]])}),
  Object.freeze({id:'ozeti-local-048',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8460.3,3387.1],[8440.0,3386.9],[8459.9,3407.1]])}),
  Object.freeze({id:'ozeti-local-049',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8460.3,3387.1],[8480.5,3387.3],[8459.9,3407.1]])}),
  Object.freeze({id:'ozeti-local-050',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7801.0,7323.5],[7821.6,7303.7],[7801.3,7303.5]])}),
  Object.freeze({id:'ozeti-local-051',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8112.6,8007.1],[8193.6,8007.9]])}),
  Object.freeze({id:'ozeti-local-052',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12501.9,6129.5],[12441.2,6128.9]])}),
  Object.freeze({id:'ozeti-local-053',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6938.9,6834.5],[6898.4,6834.1]])}),
  Object.freeze({id:'ozeti-local-054',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6938.9,6834.5],[6959.5,6814.7],[6938.9,6834.5]])}),
  Object.freeze({id:'ozeti-local-055',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11937.2,7104.6],[11998.0,7105.2]])}),
  Object.freeze({id:'ozeti-local-056',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8228.9,4966.0],[8248.8,4986.2],[8247.3,5066.2],[8226.7,5086.0]])}),
  Object.freeze({id:'ozeti-local-057',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8228.9,4966.0],[8229.2,4946.0],[8208.6,4965.8]])}),
  Object.freeze({id:'ozeti-local-058',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8176.2,4525.1],[8174.0,4645.2],[8153.3,4665.0]])}),
  Object.freeze({id:'ozeti-local-059',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9540.2,5259.3],[9519.6,5279.1],[9418.3,5278.1]])}),
  Object.freeze({id:'ozeti-local-060',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9540.2,5259.3],[9560.8,5239.5]])}),
  Object.freeze({id:'ozeti-local-061',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9108.3,5615.2],[9148.8,5615.6]])}),
  Object.freeze({id:'ozeti-local-062',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9560.8,5239.5],[9621.5,5240.1]])}),
  Object.freeze({id:'ozeti-local-063',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8200.8,4285.2],[8180.2,4305.0],[8180.5,4285.0]])}),
  Object.freeze({id:'ozeti-local-064',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8200.8,4285.2],[8180.9,4265.0],[8180.5,4285.0]])}),
  Object.freeze({id:'ozeti-local-065',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11622.0,6621.1],[11581.4,6620.7]])}),
  Object.freeze({id:'ozeti-local-066',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12420.7,7249.5],[12421.5,7209.5]])}),
  Object.freeze({id:'ozeti-local-067',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7113.6,8357.4],[7093.7,8337.2],[7093.4,8357.2]])}),
  Object.freeze({id:'ozeti-local-068',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8744.1,7813.3],[8724.2,7793.1]])}),
  Object.freeze({id:'ozeti-local-069',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8744.1,7813.3],[8845.3,7814.3],[8865.9,7794.5]])}),
  Object.freeze({id:'ozeti-local-070',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11898.5,7004.1],[11897.8,7044.1]])}),
  Object.freeze({id:'ozeti-local-071',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8365.6,8570.1],[8364.9,8610.1]])}),
  Object.freeze({id:'ozeti-local-072',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7187.9,7617.6],[7188.6,7577.6]])}),
  Object.freeze({id:'ozeti-local-073',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12362.2,7128.8],[12360.7,7208.9]])}),
  Object.freeze({id:'ozeti-local-074',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7198.3,5936.4],[7157.8,5936.0]])}),
  Object.freeze({id:'ozeti-local-075',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11938.3,7044.5],[11958.2,7064.8],[11938.0,7064.6]])}),
  Object.freeze({id:'ozeti-local-076',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11938.3,7044.5],[11939.1,7004.5]])}),
  Object.freeze({id:'ozeti-local-077',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7685.8,8082.9],[7665.6,8082.7],[7686.2,8062.9]])}),
  Object.freeze({id:'ozeti-local-078',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7685.8,8082.9],[7706.1,8083.1],[7686.2,8062.9]])}),
  Object.freeze({id:'ozeti-local-079',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8386.2,8550.3],[8366.4,8530.1],[8366.0,8550.1]])}),
  Object.freeze({id:'ozeti-local-080',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9277.3,5236.6],[9278.7,5156.6]])}),
  Object.freeze({id:'ozeti-local-081',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8130.5,7026.6],[8130.8,7006.6],[8110.2,7026.4]])}),
  Object.freeze({id:'ozeti-local-082',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11909.5,6403.8],[11908.8,6443.8]])}),
  Object.freeze({id:'ozeti-local-083',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7993.6,7865.8],[7892.4,7864.8]])}),
  Object.freeze({id:'ozeti-local-084',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7524.2,8061.3],[7422.9,8060.3]])}),
  Object.freeze({id:'ozeti-local-085',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6967.0,7515.3],[6966.2,7555.4]])}),
  Object.freeze({id:'ozeti-local-086',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8663.6,8893.3],[8501.6,8891.7]])}),
  Object.freeze({id:'ozeti-local-087',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9421.2,5118.0],[9482.0,5118.6]])}),
  Object.freeze({id:'ozeti-local-088',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11842.9,6723.4],[11822.7,6723.2],[11842.5,6743.4]])}),
  Object.freeze({id:'ozeti-local-089',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8344.3,8629.9],[8303.8,8629.5]])}),
  Object.freeze({id:'ozeti-local-090',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11867.5,6483.4],[11827.0,6483.0]])}),
  Object.freeze({id:'ozeti-local-091',class:'local',width:6.5,centerLine:false,points:Object.freeze([[13585.9,5559.8],[13585.6,5579.9],[13565.7,5559.6]])}),
  Object.freeze({id:'ozeti-local-092',class:'local',width:6.5,centerLine:false,points:Object.freeze([[13585.9,5559.8],[13586.3,5539.8],[13565.7,5559.6]])}),
  Object.freeze({id:'ozeti-local-093',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12705.6,6071.5],[12746.1,6071.9]])}),
  Object.freeze({id:'ozeti-local-094',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8377.4,3486.3],[8438.5,3466.9]])}),
  Object.freeze({id:'ozeti-local-095',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8684.8,7732.6],[8644.3,7732.2]])}),
  Object.freeze({id:'ozeti-local-096',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7377.7,6098.4],[7398.3,6078.5],[7378.1,6078.3]])}),
  Object.freeze({id:'ozeti-local-097',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8965.4,7895.6],[8945.1,7895.4],[8965.0,7915.6]])}),
  Object.freeze({id:'ozeti-local-098',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8965.4,7895.6],[8985.6,7895.8],[8965.0,7915.6]])}),
  Object.freeze({id:'ozeti-local-099',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9320.0,5117.0],[9380.7,5117.6]])}),
  Object.freeze({id:'ozeti-local-100',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8318.1,3405.7],[8337.3,3465.9]])}),
  Object.freeze({id:'ozeti-local-101',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8146.0,5065.2],[8147.5,4985.2],[8208.6,4965.8]])}),
  Object.freeze({id:'ozeti-local-102',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8639.9,5750.7],[8639.6,5770.7],[8619.7,5750.5]])}),
  Object.freeze({id:'ozeti-local-103',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8338.7,3385.9],[8358.3,3426.1]])}),
  Object.freeze({id:'ozeti-local-104',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7497.4,3977.9],[7518.0,3958.1],[7497.8,3957.9]])}),
  Object.freeze({id:'ozeti-local-105',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11500.1,6639.9],[11459.6,6639.5]])}),
  Object.freeze({id:'ozeti-local-106',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7735.5,5361.4],[7715.6,5341.1],[7715.3,5361.2]])}),
  Object.freeze({id:'ozeti-local-107',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7928.0,7024.5],[7907.3,7044.4],[7928.0,7024.5]])}),
  Object.freeze({id:'ozeti-local-108',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7928.0,7024.5],[8009.0,7025.4]])}),
  Object.freeze({id:'ozeti-local-109',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7189.0,7557.6],[7209.3,7557.8],[7188.6,7577.6]])}),
  Object.freeze({id:'ozeti-local-110',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7189.0,7557.6],[7169.1,7537.4],[7168.7,7557.4]])}),
  Object.freeze({id:'ozeti-local-111',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9218.7,5116.0],[9239.7,5076.1]])}),
  Object.freeze({id:'ozeti-local-112',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7027.3,7536.0],[7006.4,7575.8]])}),
  Object.freeze({id:'ozeti-local-113',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8741.9,5711.7],[8681.2,5711.1]])}),
  Object.freeze({id:'ozeti-local-114',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8377.7,7909.7],[8378.8,7849.7],[8419.7,7830.1]])}),
  Object.freeze({id:'ozeti-local-115',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8560.0,7911.5],[8478.6,7930.7]])}),
  Object.freeze({id:'ozeti-local-116',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7847.5,8104.6],[7849.3,8004.5]])}),
  Object.freeze({id:'ozeti-local-117',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8342.7,5387.4],[8362.6,5407.6]])}),
  Object.freeze({id:'ozeti-local-118',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8342.7,5387.4],[8343.4,5347.4]])}),
  Object.freeze({id:'ozeti-local-119',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6954.2,8215.8],[7014.9,8216.4]])}),
  Object.freeze({id:'ozeti-local-120',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6954.2,8215.8],[6934.3,8195.5],[6933.9,8215.5]])}),
  Object.freeze({id:'ozeti-local-121',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12044.7,6765.4],[12043.6,6825.4]])}),
  Object.freeze({id:'ozeti-local-122',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9289.5,3455.4],[9289.2,3475.4],[9269.3,3455.2]])}),
  Object.freeze({id:'ozeti-local-123',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9254.8,5356.5],[9254.4,5376.5],[9234.6,5356.3]])}),
  Object.freeze({id:'ozeti-local-124',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11178.6,6496.6],[11219.1,6497.0]])}),
  Object.freeze({id:'ozeti-local-125',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7284.5,5657.1],[7284.8,5637.1],[7304.7,5657.3]])}),
  Object.freeze({id:'ozeti-local-126',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11108.4,4794.6],[11209.6,4795.6],[11229.5,4815.8]])}),
  Object.freeze({id:'ozeti-local-127',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8419.7,7830.1],[8440.3,7810.3],[8439.9,7830.3]])}),
  Object.freeze({id:'ozeti-local-128',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8822.9,5712.5],[8782.4,5712.1]])}),
  Object.freeze({id:'ozeti-local-129',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7420.2,7099.5],[7419.8,7119.6],[7399.9,7099.3]])}),
  Object.freeze({id:'ozeti-local-130',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11903.7,6724.0],[11984.7,6724.8]])}),
  Object.freeze({id:'ozeti-local-131',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8479.0,5689.0],[8498.9,5709.2]])}),
  Object.freeze({id:'ozeti-local-132',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8094.2,7906.9],[8094.5,7886.9],[8073.9,7906.7]])}),
  Object.freeze({id:'ozeti-local-133',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8928.0,8835.9],[9069.7,8837.3]])}),
  Object.freeze({id:'ozeti-local-134',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8069.4,7046.0],[8049.1,7045.8],[8069.7,7026.0]])}),
  Object.freeze({id:'ozeti-local-135',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11627.6,5200.0],[11607.8,5179.8],[11607.4,5199.8]])}),
  Object.freeze({id:'ozeti-local-136',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6933.5,8235.6],[6932.8,8275.6]])}),
  Object.freeze({id:'ozeti-local-137',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11259.6,6497.4],[11300.1,6497.8]])}),
  Object.freeze({id:'ozeti-local-138',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8283.2,8649.3],[8303.8,8629.5]])}),
  Object.freeze({id:'ozeti-local-139',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7365.5,5657.9],[7325.0,5657.5]])}),
  Object.freeze({id:'ozeti-local-140',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7666.9,6901.9],[7606.1,6901.2]])}),
  Object.freeze({id:'ozeti-local-141',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9563.7,5079.4],[9583.6,5099.6],[9563.3,5099.4]])}),
  Object.freeze({id:'ozeti-local-142',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11540.2,6660.3],[11539.5,6700.3]])}),
  Object.freeze({id:'ozeti-local-143',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6628.7,8292.6],[6709.7,8293.4]])}),
  Object.freeze({id:'ozeti-local-144',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7865.7,7104.0],[7845.9,7083.8],[7866.1,7084.0]])}),
  Object.freeze({id:'ozeti-local-145',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7865.7,7104.0],[7886.4,7084.2],[7866.1,7084.0]])}),
  Object.freeze({id:'ozeti-local-146',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11989.4,6464.6],[11928.7,6464.0]])}),
  Object.freeze({id:'ozeti-local-147',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9150.3,3313.9],[9149.9,3333.9],[9130.1,3313.7]])}),
  Object.freeze({id:'ozeti-local-148',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9150.3,3313.9],[9150.7,3293.9],[9130.1,3313.7]])}),
  Object.freeze({id:'ozeti-local-149',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8013.5,7886.1],[8053.6,7906.5]])}),
  Object.freeze({id:'ozeti-local-150',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9240.4,5036.1],[9241.5,4976.1]])}),
  Object.freeze({id:'ozeti-local-151',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11320.0,6518.0],[11319.3,6558.0]])}),
  Object.freeze({id:'ozeti-local-152',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12290.7,6607.7],[12270.8,6587.5],[12270.4,6607.5]])}),
  Object.freeze({id:'ozeti-local-153',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7723.2,7142.6],[7703.4,7122.4],[7723.6,7122.6]])}),
  Object.freeze({id:'ozeti-local-154',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8827.5,6573.2],[8868.0,6573.6]])}),
  Object.freeze({id:'ozeti-local-155',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9146.7,3514.0],[9187.2,3514.4]])}),
  Object.freeze({id:'ozeti-local-156',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7260.2,5877.0],[7240.3,5856.8],[7239.9,5876.8]])}),
  Object.freeze({id:'ozeti-local-157',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8620.4,5710.4],[8559.6,5709.8]])}),
  Object.freeze({id:'ozeti-local-158',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8620.4,5710.4],[8640.3,5730.7]])}),
  Object.freeze({id:'ozeti-local-159',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8315.5,7989.2],[8335.4,8009.4]])}),
  Object.freeze({id:'ozeti-local-160',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8505.5,3127.3],[8505.2,3147.3],[8485.3,3127.1]])}),
  Object.freeze({id:'ozeti-local-161',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8505.5,3127.3],[8505.9,3107.3],[8485.3,3127.1]])}),
  Object.freeze({id:'ozeti-local-162',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7789.3,7963.9],[7809.9,7944.1],[7809.5,7964.1]])}),
  Object.freeze({id:'ozeti-local-163',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7187.2,7657.6],[7186.4,7697.7]])}),
  Object.freeze({id:'ozeti-local-164',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8725.4,8833.9],[8704.8,8853.7],[8725.4,8833.9]])}),
  Object.freeze({id:'ozeti-local-165',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8725.4,8833.9],[8726.9,8753.8]])}),
  Object.freeze({id:'ozeti-local-166',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7373.2,3016.0],[7371.4,3116.0]])}),
  Object.freeze({id:'ozeti-local-167',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6847.3,7414.1],[6725.7,7412.9]])}),
  Object.freeze({id:'ozeti-local-168',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11828.9,6383.0],[11889.6,6383.6]])}),
  Object.freeze({id:'ozeti-local-169',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6997.4,6955.2],[6998.2,6915.2]])}),
  Object.freeze({id:'ozeti-local-170',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7316.6,6117.8],[7357.8,6078.1]])}),
  Object.freeze({id:'ozeti-local-171',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8642.1,7852.3],[8621.4,7872.1]])}),
  Object.freeze({id:'ozeti-local-172',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8642.1,7852.3],[8682.6,7852.7]])}),
  Object.freeze({id:'ozeti-local-173',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7548.3,6740.5],[7546.4,6840.6]])}),
  Object.freeze({id:'ozeti-local-174',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9361.2,5077.3],[9320.7,5076.9]])}),
  Object.freeze({id:'ozeti-local-175',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8400.2,3346.4],[8359.7,3346.0]])}),
  Object.freeze({id:'ozeti-local-176',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9711.5,3639.7],[9671.0,3639.3]])}),
  Object.freeze({id:'ozeti-local-177',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7036.5,7035.7],[7015.9,7055.5],[7016.2,7035.5]])}),
  Object.freeze({id:'ozeti-local-178',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6987.6,7495.5],[6967.7,7475.3],[6967.3,7495.3]])}),
  Object.freeze({id:'ozeti-local-179',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8404.3,3126.3],[8485.3,3127.1]])}),
  Object.freeze({id:'ozeti-local-180',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7302.9,5757.3],[7304.4,5677.3]])}),
  Object.freeze({id:'ozeti-local-181',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9416.8,7579.8],[9356.0,7579.2]])}),
  Object.freeze({id:'ozeti-local-182',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12063.5,6845.6],[12042.9,6865.5],[12043.2,6845.4]])}),
  Object.freeze({id:'ozeti-local-183',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12063.5,6845.6],[12084.1,6825.8]])}),
  Object.freeze({id:'ozeti-local-184',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9130.1,3313.7],[9089.6,3313.3]])}),
  Object.freeze({id:'ozeti-local-185',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8382.6,8750.4],[8362.3,8750.2],[8383.0,8730.4]])}),
  Object.freeze({id:'ozeti-local-186',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8382.6,8750.4],[8402.8,8750.6],[8383.0,8730.4]])}),
  Object.freeze({id:'ozeti-local-187',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8905.0,5653.2],[8904.7,5673.3],[8884.8,5653.0]])}),
  Object.freeze({id:'ozeti-local-188',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9343.5,2715.4],[9341.7,2815.4]])}),
  Object.freeze({id:'ozeti-local-189',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8603.9,3288.4],[8745.6,3289.8]])}),
  Object.freeze({id:'ozeti-local-190',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7782.9,7203.2],[7781.4,7283.3]])}),
  Object.freeze({id:'ozeti-local-191',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6998.5,6895.2],[6978.3,6895.0],[6998.2,6915.2]])}),
  Object.freeze({id:'ozeti-local-192',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7092.6,8397.3],[7091.9,8437.3]])}),
  Object.freeze({id:'ozeti-local-193',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6566.4,8372.0],[6546.6,8351.8],[6566.8,8352.0]])}),
  Object.freeze({id:'ozeti-local-194',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9157.6,5135.4],[9198.1,5135.8]])}),
  Object.freeze({id:'ozeti-local-195',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7727.6,6902.5],[7788.4,6903.1]])}),
  Object.freeze({id:'ozeti-local-196',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12543.7,7170.7],[12543.0,7210.7]])}),
  Object.freeze({id:'ozeti-local-197',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11835.2,7143.6],[11896.0,7144.2]])}),
  Object.freeze({id:'ozeti-local-198',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8207.5,5025.8],[8206.8,5065.8]])}),
  Object.freeze({id:'ozeti-local-199',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8705.4,7712.8],[8706.5,7652.8]])}),
  Object.freeze({id:'ozeti-local-200',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9207.0,3534.6],[9206.3,3574.7]])}),
  Object.freeze({id:'ozeti-local-201',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9207.0,3534.6],[9187.2,3514.4]])}),
  Object.freeze({id:'ozeti-local-202',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8888.2,6573.8],[8888.6,6553.8],[8868.0,6573.6]])}),
  Object.freeze({id:'ozeti-local-203',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11605.2,5319.9],[11606.7,5239.9]])}),
  Object.freeze({id:'ozeti-local-204',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7371.4,3116.0],[7391.3,3136.2]])}),
  Object.freeze({id:'ozeti-local-205',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8334.3,8069.4],[8335.4,8009.4]])}),
  Object.freeze({id:'ozeti-local-206',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7678.7,7362.3],[7759.7,7363.1]])}),
  Object.freeze({id:'ozeti-local-207',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8906.1,7814.9],[8926.7,7795.1],[8906.4,7794.9]])}),
  Object.freeze({id:'ozeti-local-208',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11980.7,6944.9],[12001.3,6925.1],[11980.7,6944.9]])}),
  Object.freeze({id:'ozeti-local-209',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8398.4,5668.2],[8459.1,5668.8]])}),
  Object.freeze({id:'ozeti-local-210',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9621.5,5240.1],[9642.2,5220.3]])}),
  Object.freeze({id:'ozeti-local-211',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8165.8,9528.8],[8164.0,9628.9]])}),
  Object.freeze({id:'ozeti-local-212',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9463.9,4998.3],[9464.6,4958.3]])}),
  Object.freeze({id:'ozeti-local-213',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7059.3,6895.8],[7079.5,6896.0],[7059.7,6875.8]])}),
  Object.freeze({id:'ozeti-local-214',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7006.4,7575.8],[7006.0,7595.8],[6986.1,7575.6]])}),
  Object.freeze({id:'ozeti-local-215',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8153.3,4665.0],[8153.0,4685.0],[8133.1,4664.8]])}),
  Object.freeze({id:'ozeti-local-216',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11896.0,7144.2],[11916.6,7124.4]])}),
  Object.freeze({id:'ozeti-local-217',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8047.2,9367.5],[8046.5,9407.6]])}),
  Object.freeze({id:'ozeti-local-218',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11911.0,6323.7],[11910.2,6363.7]])}),
  Object.freeze({id:'ozeti-local-219',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11862.1,6783.6],[11861.3,6823.6]])}),
  Object.freeze({id:'ozeti-local-220',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8724.2,7793.1],[8704.7,7752.9]])}),
  Object.freeze({id:'ozeti-local-221',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8458.8,3467.1],[8478.7,3487.3],[8681.2,3489.4]])}),
  Object.freeze({id:'ozeti-local-222',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11750.6,5121.2],[11748.8,5221.3]])}),
  Object.freeze({id:'ozeti-local-223',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8027.7,9327.3],[8029.9,9207.2]])}),
  Object.freeze({id:'ozeti-local-224',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8364.2,8650.1],[8383.0,8730.4]])}),
  Object.freeze({id:'ozeti-local-225',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12065.7,6725.6],[12085.6,6745.8],[12084.1,6825.8]])}),
  Object.freeze({id:'ozeti-local-226',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8620.7,7912.1],[8620.4,7932.1],[8600.5,7911.9]])}),
  Object.freeze({id:'ozeti-local-227',class:'local',width:6.5,centerLine:false,points:Object.freeze([[12746.1,6071.9],[12766.7,6052.0],[12746.1,6071.9]])}),
  Object.freeze({id:'ozeti-local-228',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8595.9,7051.2],[8595.2,7091.3]])}),
  Object.freeze({id:'ozeti-local-229',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7014.9,8216.4],[7034.8,8236.6],[7014.9,8216.4]])}),
  Object.freeze({id:'ozeti-local-230',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7982.3,8486.2],[7860.8,8485.0]])}),
  Object.freeze({id:'ozeti-local-231',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6587.1,8352.2],[6587.4,8332.2],[6566.8,8352.0]])}),
  Object.freeze({id:'ozeti-local-232',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7741.3,7262.9],[7742.4,7202.8]])}),
  Object.freeze({id:'ozeti-local-233',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8501.6,8891.7],[8480.9,8911.5],[8481.3,8891.5]])}),
  Object.freeze({id:'ozeti-local-234',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8501.6,8891.7],[8481.7,8871.5],[8481.3,8891.5]])}),
  Object.freeze({id:'ozeti-local-235',class:'local',width:6.5,centerLine:false,points:Object.freeze([[6461.7,7450.3],[6542.7,7451.1]])}),
  Object.freeze({id:'ozeti-local-236',class:'local',width:6.5,centerLine:false,points:Object.freeze([[8867.5,5492.7],[8865.6,5592.8]])}),
  Object.freeze({id:'ozeti-local-237',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7850.0,7964.5],[7871.7,7884.6]])}),
  Object.freeze({id:'ozeti-local-238',class:'local',width:6.5,centerLine:false,points:Object.freeze([[7036.8,7015.7],[7017.0,6995.4],[7016.6,7015.5]])}),
  Object.freeze({id:'ozeti-local-239',class:'local',width:6.5,centerLine:false,points:Object.freeze([[11854.4,7203.8],[11935.4,7204.6]])}),
  Object.freeze({id:'ozeti-local-240',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9400.6,5137.8],[9359.7,5157.4]])}),
  Object.freeze({id:'ozeti-local-241',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9099.4,2773.0],[9078.8,2792.8],[9099.4,2773.0]])}),
  Object.freeze({id:'ozeti-local-242',class:'local',width:6.5,centerLine:false,points:Object.freeze([[9334.3,7659.1],[9354.2,7679.3],[9334.3,7659.1]])})
]);

export const ROAD_CONFIG=Object.freeze({
  primarySampleSpacingMeters:14,
  localSampleSpacingMeters:10,
  primaryRoadbedExtraMeters:12,
  localRoadbedExtraMeters:4,
  primaryShoulderExtraMeters:6,
  roadbedYOffset:.28,
  shoulderYOffset:.38,
  surfaceYOffset:.52,
  centerLineYOffset:.61,
  roadbedColor:0x81745f,
  shoulderColor:0xa79778,
  surfaceColor:0x696b66,
  centerLineColor:0xd5c58f
});

export const ROAD_PATHS=Object.freeze([
  Object.freeze({
    id:'ozeti-west-east-arterial',
    class:'primary',
    width:18,
    centerLine:true,
    points:WEST_EAST_POINTS
  }),
  Object.freeze({
    id:'ozeti-north-arterial',
    class:'primary',
    width:16,
    centerLine:true,
    points:NORTH_POINTS
  }),
  ...LOCAL_PATHS
]);

function pathLength(points){
  let length=0;
  for(let i=1;i<points.length;i++){
    length+=Math.hypot(
      points[i][0]-points[i-1][0],
      points[i][1]-points[i-1][1]
    );
  }
  return length;
}

function insidePlayable(point){
  const eps=.15;
  return (
    point[0]>=OZETI_PLAYABLE_BOUNDS.minX-eps &&
    point[0]<=OZETI_PLAYABLE_BOUNDS.maxX+eps &&
    point[1]>=OZETI_PLAYABLE_BOUNDS.minY-eps &&
    point[1]<=OZETI_PLAYABLE_BOUNDS.maxY+eps
  );
}

for(const path of ROAD_PATHS){
  if(path.points.length<2){
    throw new Error(`Ozeti v88 invalid road path: ${path.id}`);
  }
  if(!Number.isFinite(path.width) || path.width<=0){
    throw new Error(`Ozeti v88 invalid road width: ${path.id}`);
  }
  for(const point of path.points){
    if(!insidePlayable(point)){
      throw new Error(
        `Ozeti v88 road point outside playable bounds: ${path.id} ${point[0]},${point[1]}`
      );
    }
  }
}

export const ROAD_STATS=Object.freeze({
  paths:ROAD_PATHS.length,
  primaryPaths:ROAD_PATHS.filter(path=>path.class==='primary').length,
  localPaths:ROAD_PATHS.filter(path=>path.class==='local').length,
  controlPoints:ROAD_PATHS.reduce((sum,path)=>sum+path.points.length,0),
  totalLengthMeters:ROAD_PATHS.reduce((sum,path)=>sum+pathLength(path.points),0),
  primaryLengthMeters:ROAD_PATHS
    .filter(path=>path.class==='primary')
    .reduce((sum,path)=>sum+pathLength(path.points),0),
  localLengthMeters:ROAD_PATHS
    .filter(path=>path.class==='local')
    .reduce((sum,path)=>sum+pathLength(path.points),0),
  source:'ozeti-tactical-map-v1.png / tactical affine calibration / v87 road-ridge vectorization'
});
