'use client';
import {useState, useEffect, useRef} from 'react';
import {fetchStats, findStatId, extractValue} from '../utils/stats';
import {timeSince} from '../gmb/time';
import {ITEM_CLASS_MAP} from '../constants/itemTypes';
import {renderMods} from "@/app/gmb/showMods";
import {parseItemText} from "@/app/gmb/parseItem";
import type {FetchItem} from "@/app/types/fetchItem";

interface ItemCheckerProps {
    league: string;
}

const RATE_LIMIT_DELAY = 1000;

export default function ItemChecker({league}: ItemCheckerProps) {
    const itemSearchBoxRef = useRef<HTMLInputElement>(null);
    const [itemText, setItemText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [reduceStatValuePercentage, setReduceStatValuePercentage] = useState(1);
    const [isStatsLoaded, setIsStatsLoaded] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            try {
                await fetchStats();
                setIsStatsLoaded(true);
            } catch (error) {
                setError('Failed to load item stats database');
                console.error('Failed to load stats:', error);
            }
        };
        loadStats();
        itemSearchBoxRef.current!.focus();
    }, []);

    const handleSearch = async () => {

        const itemsForTradeHtml = document.getElementById("itemsFromTrade");
        if (itemsForTradeHtml != null) {
            itemsForTradeHtml.innerHTML = '';
        }

        if (!itemText.trim()) {
            setError('Please paste an item first');
            return;
        }

        if (!isStatsLoaded) {
            setError('Item stats database is not ready yet. Please try again in a moment.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const parsedItem = parseItemText(itemText);

            if (parsedItem.itemClass && !ITEM_CLASS_MAP[parsedItem.itemClass]) {
                console.warn(`Item type "${parsedItem.itemClass}" is not supported yet`);
            }

            // Create base query structure
            const baseQuery = {
                query: {
                    status: {option: "online"},
                    stats: [{type: "and", filters: [], disabled: false}]
                },
                sort: {price: "asc"}
            };

            let category = {}
            if (parsedItem.itemClass && ITEM_CLASS_MAP[parsedItem.itemClass]) {
                category = {
                    category: {
                        option: ITEM_CLASS_MAP[parsedItem.itemClass]
                    }
                }
            }

            // Build the query based on item type
            let query;
            if (parsedItem.rarity === 'Unique' && parsedItem.name && parsedItem.baseType) {
                query = {
                    ...baseQuery,
                    query: {
                        ...baseQuery.query,
                        name: parsedItem.name,
                        type: parsedItem.baseType,
                        filters: {
                            type_filters: {
                                filters: {
                                    ...category
                                },
                                disabled: false
                            }
                        }
                    }
                };
            } else {
                const statFilters = parsedItem.stats
                    .filter(stat => {
                        const checkboxes = document.querySelectorAll("input[type='checkbox']:checked");
                        let checked = false;
                        checkboxes.forEach(checkbox => {
                            if (checkbox.id == stat) {
                                console.log("Adding " + stat);
                                checked = true;
                            }
                        })
                        return checked;
                    })
                    .map(stat => {
                        const statId = findStatId(stat);
                        if (!statId) {
                            console.log('No stat ID found for:', stat);
                            return null;
                        }

                        const value = extractValue(stat);
                        // console.log('Found stat:', {id: statId, value, originalStat: stat});

                        return {
                            id: statId,
                            value: {min: Math.round(value*reduceStatValuePercentage)},
                            disabled: false
                        };
                    })
                    .filter((filter): filter is NonNullable<typeof filter> => filter !== null);

                if (statFilters.length === 0) {
                    setError('No valid stats found to search for');
                    setLoading(false);
                    return;
                }

                query = {
                    ...baseQuery,
                    query: {
                        ...baseQuery.query,
                        stats: [{
                            type: "and",
                            filters: statFilters,
                            disabled: false
                        }],
                        filters: {
                            type_filters: {
                                filters: {
                                    ...category
                                },
                                disabled: false
                            }
                        }
                    }
                };
            }

            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

            console.log('Query', query);

            const response = await fetch('/api/poe/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({query, league}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment and try again.');
                }
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();

            if (data.id) {
                const response = await fetch('/api/poe/fetch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({data}),
                });
                const openInTrade = document.getElementById('openInTrade') as HTMLLinkElement
                openInTrade.href = `https://www.pathofexile.com/trade2/search/${league}/${data.id}`;
                //window.open(`https://www.pathofexile.com/trade2/search/${league}/${data.id}`, '_blank');
                const result = await response.json();

                const ul = document.getElementById('itemsFromTrade') as HTMLUListElement;
                if (result.length == 1 && result[0] ==  null) {
                    const li = document.createElement('li');  // Create a new <li> element
                    const textNode = document.createTextNode('No results found');
                    li.appendChild(textNode);
                    ul.appendChild(li);
                } else {
                    result
                        .filter((i: FetchItem) => i != null)
                        .forEach((i: FetchItem) => {
                            const date = timeSince(i.listing.indexed);
                            const li = document.createElement('li');  // Create a new <li> element
                            const textNode = document.createTextNode(`${i.listing.price.amount} ${i.listing.price.currency} - ${date} (${i.item.baseType} ilvl:${i.item.ilvl})`);
                            li.appendChild(textNode);
                            ul.appendChild(li);
                        });
                }


            } else {
                throw new Error('No search ID returned');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearSearchBox = () => {
        const item = document.getElementById("item");
        if (item != null) {
            item.innerHTML = '';
        }
        itemSearchBoxRef.current!.focus();
    }

    const formatItemText = (text: string) => {
        if (!text) return '';

        return text.split('\n').map((line, i) => {
            if (line.includes('--------')) {
                return `<div class="text-blue-400/50">--------</div>`;
            }
            if (line.startsWith('Item Class:')) {
                return `<div class="text-cyan-400">${line}</div>`;
            }
            if (line.startsWith('Item Level:')) {
                return `<div class="text-blue-400">${line}</div>`;
            }
            if (line.startsWith('Rarity:')) {
                return `<div class="text-yellow-400">${line}</div>`;
            }
            if (line.match(/[0-9]+/)) {
                return `<div class="text-cyan-300">${line}</div>`;
            }
            if (line.includes('Requires')) {
                return `<div class="text-gray-400">${line}</div>`;
            }
            if (i <= 2 && line.trim() && !line.includes(':')) {
                return `<div class="text-yellow-200 font-semibold">${line}</div>`;
            }
            return `<div class="text-white/90">${line}</div>`;
        }).join('');
    };

    return (
        <div className="space-y-4 backdrop-blur-sm bg-white/5 rounded-2xl p-6 shadow-xl">
            {/*Panel to past the item stats*/}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"/>
                <div id="item"
                     ref={itemSearchBoxRef}
                     contentEditable
                     className="relative w-full h-64 p-4 rounded-xl bg-slate-900/90 border border-white/10
                     focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                     text-white/90 font-mono text-sm overflow-auto whitespace-pre-wrap
                     transition-all duration-200 focus:outline-none
                     [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10
                     [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                     onPaste={(e) => {
                         e.preventDefault();
                         const text = e.clipboardData.getData('text');
                         const formatted = formatItemText(text);
                         e.currentTarget.innerHTML = formatted;
                         setItemText(text);
                         renderMods(text);
                     }}
                     onInput={(e) => {
                         const text = e.currentTarget.innerText;
                         setItemText(text);
                         renderMods(text);
                     }}
                     dangerouslySetInnerHTML={{__html: itemText ? formatItemText(itemText) : ''}}
                     spellCheck={false}
                />
            </div>
            <button
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white
                   font-medium shadow-lg shadow-blue-500/20 transition-all
                   duration-200 disabled:opacity-50 relative group"
                onClick={clearSearchBox}
            >
                <div
                    className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-200"/>
                <div className="relative">Clear</div>
            </button>

            {/*Panel showing the item mods*/}
            <div className="relative group">
                <div
                    className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"/>
                <div className="relative w-full h-64 p-4 rounded-xl bg-slate-900/90 border border-white/10
                     focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                     text-white/90 font-mono text-sm overflow-auto whitespace-pre-wrap
                     transition-all duration-200 focus:outline-none
                     [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10
                     [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
                    <ul id="itemMods" className="item-list"></ul>
                </div>
            </div>

            {error && (
                <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2 border border-red-500/20">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-center gap-3 text-white/80">
                <input type="radio" id="100" name="fav_language" onChange={() => setReduceStatValuePercentage(1)}/>
                <label htmlFor="100">None</label><br/>
                <input type="radio" id="90" name="fav_language" onChange={() => setReduceStatValuePercentage(0.9)}/>
                <label htmlFor="90">-10%</label><br/>
                <input type="radio" id="80" name="fav_language" onChange={() => setReduceStatValuePercentage(0.8)}/>
                <label htmlFor="80">-20%</label><br/>
                <input type="radio" id="50" name="fav_language" onChange={() => setReduceStatValuePercentage(0.5)}/>
                <label htmlFor="50">-50%</label>
            </div>

            <button
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white
                   font-medium shadow-lg shadow-blue-500/20 transition-all
                   duration-200 disabled:opacity-50 relative group"
                onClick={handleSearch}
                disabled={loading}
            >
                <div
                    className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-200"/>
                <div className="relative">
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"
                        fill="none"/>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Searching...
            </span>
                    ) : (
                        'Search on PoE Trade'
                    )}
                </div>
            </button>

            {/*Panel showing results from trade*/}
            <div className="relative group">
                <div
                    className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"/>
                <div className="relative w-full h-64 p-4 rounded-xl bg-slate-900/90 border border-white/10
                     focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                     text-white/90 font-mono text-sm overflow-auto whitespace-pre-wrap
                     transition-all duration-200 focus:outline-none
                     [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10
                     [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
                    <ul id="itemsFromTrade" className="item-list"></ul>
                </div>
            </div>

            <a id="openInTrade" target="_blank">
                <button
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600
                   hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white
                   font-medium shadow-lg shadow-blue-500/20 transition-all
                   duration-200 disabled:opacity-50 relative group"
                >
                    <div
                        className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-200"/>
                    <div className="relative">
                        Open in Trade
                    </div>
                </button>
            </a>

        </div>
    );
}
