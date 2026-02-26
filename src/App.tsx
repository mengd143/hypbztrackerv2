/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RECIPES, NAMES, ROMAN_MAP } from './constants/recipes';
import { 
  Search, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Info,
  ArrowUpRight,
  Users,
  ShoppingCart,
  User,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BazaarProduct {
  product_id: string;
  quick_status: {
    sellPrice: number;
    buyPrice: number;
    sellVolume: number;
    buyVolume: number;
    sellOrders: number;
    buyOrders: number;
  };
}

interface BazaarData {
  success: boolean;
  lastUpdated: number;
  products: Record<string, BazaarProduct>;
}

interface CollectionMetadata {
  success: boolean;
  collections: Record<string, {
    name: string;
    items: Record<string, {
      name: string;
      tiers: { tier: number; amountRequired: number; unlocks: string[] }[];
    }>;
  }>;
}

type Language = 'en' | 'zh';

export default function App() {
  const [bazaarData, setBazaarData] = useState<BazaarData | null>(null);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMetadata | null>(null);
  const [playerCollections, setPlayerCollections] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingPlayer, setFetchingPlayer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('zh');
  const [quantity, setQuantity] = useState<number>(71680);
  const [searchTerm, setSearchTerm] = useState('');
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState(process.env.HYPIXEL_API_KEY || '');

  const fetchData = async () => {
    setLoading(true);
    try {
      const bzRes = await fetch('https://api.hypixel.net/v2/skyblock/bazaar');
      const bzData = await bzRes.json();
      
      const metaRes = await fetch('https://api.hypixel.net/v2/resources/skyblock/collections');
      const metaData = await metaRes.json();

      if (bzData.success && metaData.success) {
        setBazaarData(bzData);
        setCollectionMeta(metaData);
        setError(null);
      } else {
        setError('Failed to fetch data from Hypixel API');
      }
    } catch (err) {
      setError('Error connecting to Hypixel API');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerCollections = async () => {
    if (!username || !apiKey) return;
    setFetchingPlayer(true);
    try {
      // 1. Get UUID
      const mojangRes = await fetch(`https://api.ashcon.app/mojang/v2/user/${username}`);
      const mojangData = await mojangRes.json();
      if (!mojangData.uuid) throw new Error('Player not found');
      const uuid = mojangData.uuid;

      // 2. Get Profiles
      const profileRes = await fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${apiKey}&uuid=${uuid}`);
      const profileData = await profileRes.json();
      if (!profileData.success) throw new Error(profileData.cause || 'Failed to fetch profiles');

      const activeProfile = profileData.profiles.find((p: any) => p.selected) || profileData.profiles[0];
      if (!activeProfile) throw new Error('No SkyBlock profiles found');

      // 3. Extract Collections
      const collections = activeProfile.members[uuid.replace(/-/g, '')]?.collection || {};
      setPlayerCollections(collections);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFetchingPlayer(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const t = {
    en: {
      title: 'Hypixel Bazaar Flip Tracker',
      subtitle: 'Crafting Enchanted Items for Profit',
      searchPlaceholder: 'Search items...',
      quantityLabel: 'Purchase Quantity',
      profit: 'Profit',
      totalProfit: 'Total Profit',
      unitProfit: 'Unit Profit',
      buyPrice: 'Total Raw Cost',
      rawUnitPrice: 'Raw Unit Price',
      sellPrice: 'Sell Price (Ench)',
      volume: 'Volume',
      sellers: 'Sellers',
      buyers: 'Buyers',
      collection: 'Collection Required',
      refresh: 'Refresh',
      lastUpdated: 'Last Updated',
      noData: 'No profitable flips found.',
      loading: 'Fetching Bazaar Data...',
      raw: 'Raw Material',
      enchanted: 'Enchanted Item',
      unit: 'Unit',
      username: 'Minecraft Username',
      apiKey: 'Hypixel API Key',
      fetch: 'Fetch Data',
      locked: 'Locked',
      unlocked: 'Unlocked',
      needMore: 'Need',
      missing: 'Missing',
    },
    zh: {
      title: 'Hypixel Bazaar 倒卖追踪器',
      subtitle: '合成附魔物品赚取差价',
      searchPlaceholder: '搜索物品...',
      quantityLabel: '购买数量',
      profit: '利润',
      totalProfit: '总利润',
      unitProfit: '单件利润',
      buyPrice: '原料总成本',
      rawUnitPrice: '原料单价',
      sellPrice: '卖出价 (附魔)',
      volume: '成交量',
      sellers: '卖家数量',
      buyers: '买家数量',
      collection: '需要等级',
      refresh: '刷新',
      lastUpdated: '最后更新',
      noData: '未找到盈利的倒卖项目。',
      loading: '正在获取 Bazaar 数据...',
      raw: '原料',
      enchanted: '附魔物品',
      unit: '单位',
      username: '游戏 ID',
      apiKey: 'Hypixel API 密钥',
      fetch: '获取等级',
      locked: '未解锁',
      unlocked: '已解锁',
      needMore: '还差',
      missing: '缺少数据',
    }
  }[lang];

  const processedFlips = useMemo(() => {
    if (!bazaarData || !collectionMeta) return [];

    const flips = RECIPES.map(recipe => {
      const rawProduct = bazaarData.products[recipe.rawId];
      const enchantedProduct = bazaarData.products[recipe.enchantedId];

      if (!rawProduct || !enchantedProduct) return null;

      const rawBuyPrice = rawProduct.quick_status.buyPrice; 
      const bzSellPrice = enchantedProduct.quick_status.sellPrice;
      const npcPrice = recipe.npcPrice || 0;

      const enchantedSellPrice = Math.max(bzSellPrice, npcPrice);
      const isNpcBetter = npcPrice > bzSellPrice;

      const costPerEnchanted = rawBuyPrice * recipe.amount;
      const profitPerEnchanted = enchantedSellPrice - costPerEnchanted;
      
      const totalEnchantedPossible = Math.floor(quantity / recipe.amount);
      const totalProfit = profitPerEnchanted * totalEnchantedPossible;

      // Collection Check
      let isUnlocked = true;
      let amountNeeded = 0;
      let currentAmount = playerCollections[recipe.collectionCategory] || 0;
      let requiredAmount = 0;

      // Find threshold in meta
      for (const cat in collectionMeta.collections) {
        const item = collectionMeta.collections[cat].items[recipe.collectionCategory];
        if (item) {
          const tier = item.tiers.find(t => t.tier === recipe.collectionLevel);
          if (tier) {
            requiredAmount = tier.amountRequired;
            if (currentAmount < requiredAmount) {
              isUnlocked = false;
              amountNeeded = requiredAmount - currentAmount;
            }
          }
          break;
        }
      }

      return {
        ...recipe,
        rawName: NAMES[recipe.rawId]?.[lang] || recipe.rawId,
        enchantedName: NAMES[recipe.enchantedId]?.[lang] || recipe.enchantedId,
        rawBuyPrice,
        enchantedSellPrice,
        isNpcBetter,
        profitPerEnchanted,
        totalProfit,
        totalEnchantedPossible,
        rawSellers: rawProduct.quick_status.sellOrders,
        enchantedBuyers: enchantedProduct.quick_status.buyOrders,
        isUnlocked,
        amountNeeded,
        currentAmount,
        requiredAmount,
      };
    }).filter(f => f !== null) as any[];

    return flips
      .filter(f => 
        f.rawName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.enchantedName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [bazaarData, collectionMeta, playerCollections, quantity, lang, searchTerm]);

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    const absNum = Math.abs(num);
    if (absNum < 1) {
      return num.toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 3 
      });
    }
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 1 
    });
  };

  const formatCompact = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              {t.title}
            </h1>
            <p className="text-gray-500 mt-1">{t.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Globe size={18} />
              <span className="font-medium">{lang === 'en' ? '中文' : 'English'}</span>
            </button>
            
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl shadow-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="font-medium">{t.refresh}</span>
            </button>
          </div>
        </header>

        {/* Player Info Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t.username}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Technoblade"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t.apiKey}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your key here"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <button 
              onClick={fetchPlayerCollections}
              disabled={fetchingPlayer || !username || !apiKey}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {fetchingPlayer ? <RefreshCw size={18} className="animate-spin" /> : <Unlock size={18} />}
              {t.fetch}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            * Your API key is only used locally to fetch your data. Get one by typing <code>/api new</code> in-game.
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t.quantityLabel}
            </label>
            <div className="relative">
              <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none font-mono text-lg"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t.searchPlaceholder}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading && !bazaarData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={48} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">{t.loading}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-4 underline">Try again</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.enchanted}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.rawUnitPrice}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.buyPrice}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.sellPrice}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.unitProfit}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.totalProfit}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.volume} (S/B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {processedFlips.length > 0 ? (
                      processedFlips.map((flip, idx) => (
                        <motion.tr 
                          key={flip.enchantedId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-gray-50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span 
                                  className={`font-bold cursor-help relative ${!flip.isUnlocked ? 'text-red-600' : 'text-gray-900'}`}
                                  title={`${t.collection}: ${flip.collectionCategory} ${ROMAN_MAP[flip.collectionLevel]} (${flip.collectionLevel})`}
                                >
                                  {flip.enchantedName}
                                  <span className="ml-1 text-[10px] text-gray-400 font-normal">
                                    {ROMAN_MAP[flip.collectionLevel]} ({flip.collectionLevel})
                                  </span>
                                  <Info size={10} className="inline ml-1 text-gray-300 group-hover:text-emerald-400" />
                                </span>
                                {!flip.isUnlocked && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">
                                    <Lock size={10} />
                                    <span>{t.locked}</span>
                                  </div>
                                )}
                              </div>
                              {!flip.isUnlocked && flip.requiredAmount > 0 && (
                                <span className="text-[10px] text-red-400 font-medium">
                                  {t.needMore}: {formatCompact(flip.amountNeeded)} ({formatCompact(flip.currentAmount)}/{formatCompact(flip.requiredAmount)})
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {flip.amount}x {flip.rawName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-gray-600">{formatNumber(flip.rawBuyPrice)}</span>
                              <span className="text-[10px] text-gray-400 uppercase">{t.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-gray-600">{formatNumber(flip.rawBuyPrice * flip.amount)}</span>
                              <span className="text-[10px] text-gray-400 uppercase">{t.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-900 font-semibold">{formatNumber(flip.enchantedSellPrice)}</span>
                                {flip.isNpcBetter && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">NPC</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 uppercase">{t.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-1 font-mono font-bold ${flip.profitPerEnchanted > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {flip.profitPerEnchanted > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {formatNumber(flip.profitPerEnchanted)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`text-lg font-mono font-black ${flip.totalProfit > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatNumber(flip.totalProfit)}
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase">
                                {flip.totalEnchantedPossible} {t.unit}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1" title={t.sellers}>
                                <Users size={14} className="text-gray-400" />
                                <span>{formatCompact(flip.rawSellers)}</span>
                              </div>
                              <div className="flex items-center gap-1" title={t.buyers}>
                                <ArrowUpRight size={14} className="text-emerald-400" />
                                <span>{formatCompact(flip.enchantedBuyers)}</span>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                          {t.noData}
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {bazaarData && (
          <footer className="mt-8 flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.lastUpdated}: {new Date(bazaarData.lastUpdated).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <p>Data provided by Hypixel API</p>
              <div className="h-4 w-px bg-gray-200" />
              <p>© 2024 Hypixel Bazaar Tracker</p>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
