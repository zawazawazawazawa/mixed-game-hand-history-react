'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sidebar } from './Sidebar'
import { ClipboardIcon, Share2Icon, Trash2Icon } from 'lucide-react'

const suits = ['♠', '♥', '♦', '♣']
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

const getPositions = (tableSize: number, isPreflop: boolean) => {
  const allPositions = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  if (tableSize <= 5) {
    return allPositions.slice(-tableSize);
  } else if (tableSize === 6) {
    return ['UTG', ...allPositions.slice(-5)];
  } else if (tableSize === 7) {
    return ['UTG', 'UTG+1', ...allPositions.slice(-5)];
  } else if (tableSize === 8) {
    return ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB'];
  } else if (tableSize === 9) {
    return ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'MP', 'HJ', 'CO', 'BTN', 'SB'];
  }
};

const getPostFlopOrder = (tableSize: number) => {
  const positions = getPositions(tableSize, false);
  return [...positions.slice(-2), ...positions.slice(0, -2)];
};

type Card = {
  suit: string
  rank: string
}

type Action = {
  position: string
  action: string
  amount?: number
}

type HandHistory = {
  smallBlind: number
  bigBlind: number
  ante: number
  smallBet?: number
  bigBet?: number
  tableSize: number
  position: string
  hand: Card[]
  preflopActions: Action[]
  preflopPot: number
  flopCards: [Card, Card, Card]
  flopActions: Action[]
  flopPot: number
  turnCard: Card
  turnActions: Action[]
  turnPot: number
  riverCard: Card
  riverActions: Action[]
  riverPot: number
  villainHands: Card[][]
  villainPositions: string[]
  preflopCurrentBet: number
  flopCurrentBet: number
  turnCurrentBet: number
  riverCurrentBet: number
  effectiveStack: number
  availableActions: {
    [key: string]: string[]
  }
}

const getAvailableCards = (currentCards: Card[]) => {
  const usedCards = currentCards.filter(card => card.suit && card.rank);
  return {
    suits,
    ranks,
    isAvailable: (suit: string, rank: string) => 
      !usedCards.some(card => card.suit === suit && card.rank === rank)
  };
}

type FlopGameHandHistoryFormProps = {
  gameName: string
  handSize: number
  isFixedLimit: boolean
}

const getActivePlayersAfterStreet = (actions: Action[]): string[] => {
  const activePlayers = new Set<string>();
  const foldedPlayers = new Set<string>();

  actions.forEach(action => {
    if (action.action === 'Fold') {
      foldedPlayers.add(action.position);
    } else {
      activePlayers.add(action.position);
    }
  });

  return Array.from(activePlayers).filter(player => !foldedPlayers.has(player));
};

const getAvailableActions = (street: Action[], position: string, isPreflop: boolean): string[] => {
  const actions = ['Fold'];
  const hasBetBefore = street.some((action, index) => 
    (action.position !== position && (action.action === 'Bet' || action.action === 'Raise')) ||
    (isPreflop && index < 2) // SB and BB are considered as bets in preflop
  );

  if (!hasBetBefore) {
    actions.push('Check', 'Bet');
  } else {
    actions.push('Call', 'Raise');
  };
  actions.push('All In');

  return actions;
};

export function FlopGameHandHistoryForm({ gameName, handSize, isFixedLimit }: FlopGameHandHistoryFormProps) {
  const [handHistory, setHandHistory] = useState<HandHistory>({
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    tableSize: 6,
    position: '',
    hand: Array(handSize).fill({ suit: '', rank: '' }),
    preflopActions: [],
    preflopPot: 0,
    flopCards: [{ suit: '', rank: '' }, { suit: '', rank: '' }, { suit: '', rank: '' }],
    flopActions: [],
    flopPot: 0,
    turnCard: { suit: '', rank: '' },
    turnActions: [],
    turnPot: 0,
    riverCard: { suit: '', rank: '' },
    riverActions: [],
    riverPot: 0,
    villainHands: [],
    villainPositions: [],
    preflopCurrentBet: 0,
    flopCurrentBet: 0,
    turnCurrentBet: 0,
    riverCurrentBet: 0,
    effectiveStack: 0,
    availableActions: {}
  })

  const [activePlayers, setActivePlayers] = useState<string[]>([])
  const [formattedHistory, setFormattedHistory] = useState<string>('')
  const [betRaiseCount, setBetRaiseCount] = useState({
    preflopActions: 0,
    flopActions: 0,
    turnActions: 0,
    riverActions: 0
  })

  useEffect(() => {
    const positions = getPositions(handHistory.tableSize, true);
    setActivePlayers(positions);
    setHandHistory(prev => {
      const newHistory = {
        ...prev,
        preflopActions: positions.map(pos => ({ position: pos, action: '', amount: 0 })),
        flopActions: [],
        turnActions: [],
        riverActions: [],
        availableActions: Object.fromEntries(positions.map(pos => [pos, getAvailableActions([], pos, true)]))
      };
      return newHistory;
    })
  }, [handHistory.tableSize])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newValue = Number(value)
    setHandHistory(prev => {
      const newHistory = { 
        ...prev, 
        [name]: newValue,
        position: name === 'tableSize' ? '' : prev.position
      };
      if (name === 'smallBlind') {
        newHistory.bigBlind = newValue * 2;
      }
      if (name === 'smallBlind' || name === 'bigBlind' || name === 'ante' || name === 'effectiveStack') {
        newHistory.preflopPot = calculatePot(newHistory.preflopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize);
        newHistory.flopPot = calculatePot(newHistory.flopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.preflopPot);
        newHistory.turnPot = calculatePot(newHistory.turnActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.flopPot);
        newHistory.riverPot = calculatePot(newHistory.riverActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.turnPot);
      }
      return newHistory;
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setHandHistory(prev => ({ ...prev, [name]: value }))
  }

  const handleCardChange = (index: number, field: 'suit' | 'rank', value: string, cardType: 'hand' | 'flopCards' | 'turnCard' | 'riverCard' | 'villainHands', handIndex?: number) => {
    setHandHistory(prev => {
      const newHistory = { ...prev }
      if (cardType === 'hand' || cardType === 'flopCards') {
        newHistory[cardType][index] = {
          ...newHistory[cardType][index],
          [field]: value
        }
      } else if (cardType === 'villainHands' && handIndex !== undefined) {
        newHistory[cardType][handIndex][index] = {
          ...newHistory[cardType][handIndex][index],
          [field]: value
        }
      } else {
        newHistory[cardType] = {
          ...newHistory[cardType],
          [field]: value
        }
      }
      return newHistory
    })
  }

  const calculateLastRaiseAmount = (actions: Action[]): number => {
    let lastRaise = 0;
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].action === 'Bet' || actions[i].action === 'Raise') {
        lastRaise = actions[i].amount || 0;
        break;
      }
    }
    return lastRaise;
  }

  const getBetAmount = (street: 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions'): number => {
    if (!isFixedLimit) return 0;
    const isSmallBettingRound = street === 'preflopActions' || street === 'flopActions';
    const baseAmount = isSmallBettingRound ? handHistory.bigBlind : handHistory.bigBlind * 2;
    const currentBet = handHistory[`${street.slice(0, -7)}CurrentBet` as keyof HandHistory];
    return Math.max(currentBet + baseAmount, baseAmount);
  }

  const handleActionChange = (index: number, field: keyof Action, value: string | number, street: 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions') => {
    setHandHistory(prev => {
      const newActions = [...prev[street]];
      let newAmount = newActions[index].amount;

      if (field === 'action') {
        if (value === 'Call') {
          // Find the last raise or bet amount
          const lastRaiseOrBet = [...prev[street]].reverse().find(a => a.action === 'Raise' || a.action === 'Bet');
          newAmount = lastRaiseOrBet ? lastRaiseOrBet.amount || 0 : prev[`${street.slice(0, -7)}CurrentBet` as keyof HandHistory];
        } else if (value === 'Bet' || value === 'Raise') {
          if (isFixedLimit) {
            newAmount = getBetAmount(street);
            setBetRaiseCount(prevCount => ({
              ...prevCount,
              [street]: prevCount[street] + 1
            }));
          } else {
            newAmount = 0;
          }
        } else if (value === 'All In') {
          newAmount = 0;
        } else {
          newAmount = 0;
        }
      } else if (field === 'amount' && !isFixedLimit) {
        newAmount = value as number;
      }

      newActions[index] = { ...newActions[index], [field]: value, amount: newAmount };

      const newHistory = { ...prev, [street]: newActions };
      if (value === 'Bet' || value === 'Raise') {
        newHistory[`${street.slice(0, -7)}CurrentBet` as keyof HandHistory] = newAmount;
      }

      // 全プレイヤーの利用可能なアクションを更新
      const updatedAvailableActions = {};
      newHistory[street].forEach((action, i) => {
        updatedAvailableActions[action.position] = getAvailableActions(newHistory[street].slice(0, i), action.position, street === 'preflopActions');
      });
      newHistory.availableActions = updatedAvailableActions;

      // 既存のポット計算ロジック
      const updatedHistory = {
        ...newHistory,
        preflopPot: calculatePot(newHistory.preflopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize),
      };
      updatedHistory.flopPot = calculatePot(newHistory.flopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.preflopPot);
      updatedHistory.turnPot = calculatePot(newHistory.turnActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.flopPot);
      updatedHistory.riverPot = calculatePot(newHistory.riverActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.turnPot);

      return updatedHistory;
    });
  }

  const handleStreetActions = (street: 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions') => {
    setHandHistory(prev => {
      const newHistory = { ...prev };
      const allActions = [
        ...newHistory.preflopActions,
        ...newHistory.flopActions,
        ...newHistory.turnActions,
        ...newHistory.riverActions
      ];
      const activePositions = getActivePlayersAfterStreet(allActions);
      const positions = street === 'preflopActions' ? getPositions(newHistory.tableSize, true) : getPostFlopOrder(newHistory.tableSize);
      const orderedActivePositions = positions.filter(pos => activePositions.includes(pos));

      const lastAction = newHistory[street][newHistory[street].length - 1];
      const newAction = {
        position: orderedActivePositions[0],
        action: '',
        amount: 0
      };

      newHistory[street] = [...newHistory[street], newAction];

      // 新しいアクションの利用可能なアクションを計算
      const availableActions = getAvailableActions(newHistory[street], newAction.position, street === 'preflopActions');

      // availableActionsを更新
      newHistory.availableActions = {
        ...newHistory.availableActions,
        [newAction.position]: availableActions
      };

      return newHistory;
    });
  };

  const handleDeleteAction = (index: number, street: 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions') => {
    setHandHistory(prev => {
      const newHistory = { ...prev };
      newHistory[street] = newHistory[street].filter((_, i) => i !== index);

      // ポットの再計算
      const updatedHistory = {
        ...newHistory,
        preflopPot: calculatePot(newHistory.preflopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize),
      };
      updatedHistory.flopPot = calculatePot(newHistory.flopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.preflopPot);
      updatedHistory.turnPot = calculatePot(newHistory.turnActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.flopPot);
      updatedHistory.riverPot = calculatePot(newHistory.riverActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, updatedHistory.turnPot);

      return updatedHistory;
    });
  };

  const getAvailablePositions = () => {
    const allActions = [
      ...handHistory.preflopActions,
      ...handHistory.flopActions,
      ...handHistory.turnActions,
      ...handHistory.riverActions
    ];
    const activePlayers = getActivePlayersAfterStreet(allActions);
    return activePlayers.filter(pos => pos !== handHistory.position);
  }

  const addVillainHand = () => {
    const availablePositions = getAvailablePositions();
    if (availablePositions.length > 0) {
      setHandHistory(prev => ({
        ...prev,
        villainHands: [...prev.villainHands, Array(handSize).fill({ suit: '', rank: '' })],
        villainPositions: [...prev.villainPositions, availablePositions[0]]
      }));
    } else {
      alert('No more active positions available for villains.');
    }
  }

  const handleVillainPositionChange = (index: number, position: string) => {
    setHandHistory(prev => {
      const newVillainPositions = [...prev.villainPositions];
      newVillainPositions[index] = position;
      return { ...prev, villainPositions: newVillainPositions };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formatted = formatHandHistory(handHistory);
    setFormattedHistory(formatted);
    console.log(handHistory)
  }

  const setAnteEqualToBB = () => {
    setHandHistory(prev => {
      const newHistory = { ...prev, ante: prev.bigBlind };
      newHistory.preflopPot = calculatePot(newHistory.preflopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize);
      newHistory.flopPot = calculatePot(newHistory.flopActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.preflopPot);
      newHistory.turnPot = calculatePot(newHistory.turnActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.flopPot);
      newHistory.riverPot = calculatePot(newHistory.riverActions, newHistory.smallBlind, newHistory.bigBlind, newHistory.ante, newHistory.tableSize, newHistory.turnPot);
      return newHistory;
    });
  }

  const getAllCards = () => {
    return [
      ...handHistory.hand,
      ...handHistory.flopCards,
      handHistory.turnCard,
      handHistory.riverCard,
      ...handHistory.villainHands.flat()
    ].filter(card => card.suit && card.rank);
  }

  const calculatePot = (actions: Action[], smallBlind: number, bigBlind: number, ante: number, tableSize: number, previousPot: number = 0) => {
    let initialPot = previousPot;
    if (previousPot === 0) {
      initialPot = smallBlind + bigBlind + ante;
    }
    return actions.reduce((total, action) => {
      if (action.action === 'Bet' || action.action === 'Raise') {
        return total + (action.amount || 0);
      } else if (action.action === 'Call') {
        if (action.position === 'SB' && previousPot === 0) {
          return total + ((action.amount || 0) - smallBlind);
        } else if (action.position === 'BB' && previousPot === 0) {
          return total + ((action.amount || 0) - bigBlind);
        } else {
          return total + (action.amount || 0);
        }
      }
      return total;
    }, initialPot);
  };

  const formatHandHistory = (history: HandHistory): string => {
    let formatted = `SB: ${history.smallBlind}, BB: ${history.bigBlind}, Ante: ${history.ante}, ES: ${history.effectiveStack}\n`;
    formatted += `Players: ${history.tableSize}\n`;
    formatted += `Hero: ${history.position}, ${history.hand.map(card => card.suit + card.rank).join('')}\n`;

    // アクションの略称マッピングを追加
    const actionAbbreviations: { [key: string]: string } = {
      'Fold': 'f',
      'Raise': 'r',
      'Call': 'c',
      'Check': 'c',
      'Bet': 'b',
      'All In': 'AI'
    };

    // Preflop actions
    formatted += 'Preflop:\n';
    history.preflopActions.forEach(action => {
      formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ''}\n`;
    });
    formatted += '\n';

    const preflopTotal = history.preflopPot;

    // Flop
    if (history.flopCards.some(card => card.suit && card.rank)) {
      formatted += `f: ${history.flopCards.map(card => card.suit + card.rank).join('')} (${preflopTotal})\n\n`;
      history.flopActions.forEach(action => {
        formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ''}\n`;
      });
      formatted += '\n';
    }

    const flopTotal = preflopTotal + history.flopPot;

    // Turn
    if (history.turnCard.suit && history.turnCard.rank) {
      formatted += `t: ${history.turnCard.suit}${history.turnCard.rank} (${flopTotal})\n\n`;
      history.turnActions.forEach(action => {
        formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ''}\n`;
      });
      formatted += '\n';
    }

    const turnTotal = flopTotal + history.turnPot;

    // River
    if (history.riverCard.suit && history.riverCard.rank) {
      formatted += `r: ${history.riverCard.suit}${history.riverCard.rank} (${turnTotal})\n\n`;
      history.riverActions.forEach(action => {
        formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ''}\n`;
      });
      formatted += '\n';
    }

    // Villain hands
    history.villainHands.forEach((hand, index) => {
      formatted += `Villain ${history.villainPositions[index]}: ${hand.map(card => card.suit + card.rank).join('')}\n`;
    });

    return formatted;
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedHistory).then(() => {
      alert('Hand history copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  const shareToX = () => {
    const shareText = `${formattedHistory.slice(0, 200)}...`;
    const shareUrl = 'https://yourpokerapp.com'; // Replace with your actual app URL

    if (navigator.share) {
      navigator.share({
        title: 'My Poker Hand History',
        text: shareText,
        url: shareUrl,
      }).then(() => {
        console.log('Successfully shared');
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to opening a new window with X (Twitter) intent URL
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{gameName}</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Table Information</h2>
            <div className="flex flex-col space-y-4">
              <div>
                <Label htmlFor="smallBlind">Small Blind</Label>
                <Input type="number" id="smallBlind" name="smallBlind" value={handHistory.smallBlind} onChange={handleInputChange} min={0} onFocus={(e) => e.target.value === '0' && e.target.select()}/>
              </div>
              <div>
                <Label htmlFor="bigBlind">Big Blind</Label>
                <Input type="number" id="bigBlind" name="bigBlind" value={handHistory.bigBlind} onChange={handleInputChange} min={0} onFocus={(e) => e.target.value === '0' && e.target.select()} readOnly />
              </div>
              <div>
                <Label htmlFor="ante">BB Ante</Label>
                <div className="flex space-x-2">
                  <Input type="number" id="ante" name="ante" value={handHistory.ante} onChange={handleInputChange} min={0} onFocus={(e) => e.target.value === '0' && e.target.select()}/>
                  <Button type="button" onClick={setAnteEqualToBB}>Set Equal to BB</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="effectiveStack">Effective Stack</Label>
                <Input type="number" id="effectiveStack" name="effectiveStack" value={handHistory.effectiveStack} onChange={handleInputChange} min={0} onFocus={(e) => e.target.value === '0' && e.target.select()}/>
              </div>
              {isFixedLimit && (
                <>
                  <div>
                    <Label>Small Bet</Label>
                    <div className="text-lg font-semibold">{handHistory.bigBlind}</div>
                  </div>
                  <div>
                    <Label>Big Bet</Label>
                    <div className="text-lg font-semibold">{handHistory.bigBlind * 2}</div>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col space-y-4">
              <div>
                <Label htmlFor="tableSize">Table Size</Label>
                <Input type="number" id="tableSize" name="tableSize" value={handHistory.tableSize} onChange={handleInputChange} min={2} max={9} onFocus={(e) => e.target.value === '0' && e.target.select()}/>
              </div>
              <div>
                <Label htmlFor="position">Your Position</Label>
                <Select onValueChange={(value) => handleSelectChange('position', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Position" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPositions(handHistory.tableSize, true).map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Hand</h2>
            <div className="flex flex-col space-y-4">
              {handHistory.hand.map((card, index) => (
                <div key={index} className="flex space-x-2">
                  <Select onValueChange={(value) => handleCardChange(index, 'suit', value, 'hand')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Suit" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCards(getAllCards()).suits.map((suit) => (
                        <SelectItem key={suit} value={suit} disabled={!getAvailableCards(getAllCards()).isAvailable(suit, card.rank)}>
                          {suit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(value) => handleCardChange(index, 'rank', value, 'hand')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rank" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCards(getAllCards()).ranks.map((rank) => (
                        <SelectItem key={rank} value={rank} disabled={!getAvailableCards(getAllCards()).isAvailable(card.suit, rank)}>
                          {rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {['preflopActions', 'flopActions', 'turnActions', 'riverActions'].map((street, streetIndex) => (
            <div key={street} className="space-y-4">
              <h2 className="text-2xl font-bold">
                {street === 'preflopActions' ? 'Preflop' :
                 street === 'flopActions' ? 'Flop' :
                 street === 'turnActions' ? 'Turn' : 'River'}
              </h2>
              {street !== 'preflopActions' && (
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    {street === 'flopActions' ? (
                      <div className="space-y-4">
                        {['Flop 1', 'Flop 2', 'Flop 3'].map((label, index) => (
                          <div key={index} className="space-y-2">
                            <Label>{label}</Label>
                            <div className="flex space-x-2">
                              <Select onValueChange={(value) => handleCardChange(index, 'suit', value, 'flopCards')}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Suit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableCards(getAllCards()).suits.map((suit) => (
                                    <SelectItem key={suit} value={suit} disabled={!getAvailableCards(getAllCards()).isAvailable(suit, handHistory.flopCards[index].rank)}>
                                      {suit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select onValueChange={(value) => handleCardChange(index, 'rank', value, 'flopCards')}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Rank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableCards(getAllCards()).ranks.map((rank) => (
                                    <SelectItem key={rank} value={rank} disabled={!getAvailableCards(getAllCards()).isAvailable(handHistory.flopCards[index].suit, rank)}>
                                      {rank}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <Select onValueChange={(value) => handleCardChange(0, 'suit', value, street === 'turnActions' ? 'turnCard' : 'riverCard')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Suit" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCards(getAllCards()).suits.map((suit) => (
                              <SelectItem key={suit} value={suit} disabled={!getAvailableCards(getAllCards()).isAvailable(suit, street === 'turnActions' ? handHistory.turnCard.rank : handHistory.riverCard.rank)}>
                                {suit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select onValueChange={(value) => handleCardChange(0, 'rank', value, street === 'turnActions' ? 'turnCard' : 'riverCard')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Rank" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCards(getAllCards()).ranks.map((rank) => (
                              <SelectItem key={rank} value={rank} disabled={!getAvailableCards(getAllCards()).isAvailable(street === 'turnActions' ? handHistory.turnCard.suit : handHistory.riverCard.suit, rank)}>
                                {rank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              )}
              {handHistory[street as keyof typeof handHistory].map((action, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>{action.position}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAction(index, street as 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions')}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                  <RadioGroup
                    onValueChange={(value) => handleActionChange(index, 'action', value, street as 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions')}
                    value={action.action}
                  >
                    <div className="flex flex-wrap gap-4">
                      {handHistory.availableActions[action.position]?.map((act) => (
                        <div key={act} className="flex items-center space-x-2">
                          <RadioGroupItem value={act} id={`${street}-${index}-${act}`} />
                          <Label htmlFor={`${street}-${index}-${act}`}>{act}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {(action.action === 'Bet' || action.action === 'Raise' || action.action === 'Call' || action.action === 'All In') && (
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={action.amount !== undefined ? action.amount : ''}
                      onChange={(e) => handleActionChange(index, 'amount', Number(e.target.value), street as 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions')}
                      min={0}
                      disabled={(action.action === 'Call' && !isFixedLimit) || (isFixedLimit && action.action !== 'All In')}
                      onFocus={(e) => e.target.value === '0' && e.target.select()}
                    />
                  )}
                </div>
              ))}
              <Button type="button" onClick={() => handleStreetActions(street as 'preflopActions' | 'flopActions' | 'turnActions' | 'riverActions')}>Add {street === 'preflopActions' ? 'Preflop' : street === 'flopActions' ? 'Flop' : street === 'turnActions' ? 'Turn' : 'River'} Action</Button>
              <div>{street === 'preflopActions' ? 'Preflop' : street === 'flopActions' ? 'Flop' : street === 'turnActions' ? 'Turn' : 'River'} Pot: {handHistory[`${street.slice(0, -7)}Pot` as keyof typeof handHistory]}</div>
            </div>
          ))}

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Villain Hands</h2>
            {handHistory.villainHands.map((hand, handIndex) => (
              <div key={handIndex} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label>Villain Position</Label>
                  <Select 
                    value={handHistory.villainPositions[handIndex]} 
                    onValueChange={(value) => {
                      handleVillainPositionChange(handIndex, value);
                      document.activeElement instanceof HTMLElement && document.activeElement.blur();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Position">
                        {handHistory.villainPositions[handIndex]}
                      </SelectValue>                    
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePositions().map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col space-y-4">
                  {hand.map((card, cardIndex) => (
                    <div key={cardIndex} className="flex space-x-2">
                      <Select onValueChange={(value) => handleCardChange(cardIndex, 'suit', value, 'villainHands', handIndex)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Suit" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCards(getAllCards()).suits.map((suit) => (
                            <SelectItem key={suit} value={suit} disabled={!getAvailableCards(getAllCards()).isAvailable(suit, card.rank)}>
                              {suit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(value) => handleCardChange(cardIndex, 'rank', value, 'villainHands', handIndex)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCards(getAllCards()).ranks.map((rank) => (
                            <SelectItem key={rank} value={rank} disabled={!getAvailableCards(getAllCards()).isAvailable(card.suit, rank)}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button type="button" onClick={addVillainHand}>Add Villain Hand</Button>
          </div>

          <Button type="submit">Save Hand History</Button>
        </form>
      {formattedHistory && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Formatted Hand History</h2>
            <div className="space-x-2">
              <Button onClick={copyToClipboard} className="flex items-center gap-2">
                <ClipboardIcon className="w-4 h-4" />
                Copy
              </Button>
              <Button onClick={shareToX} className="flex items-center gap-2">
                <Share2Icon className="w-4 h-4" />
                Share to X
              </Button>
            </div>
          </div>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{formattedHistory}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

