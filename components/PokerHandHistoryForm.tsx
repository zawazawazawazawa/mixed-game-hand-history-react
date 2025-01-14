"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardIcon, Share2Icon, Trash2Icon } from "lucide-react";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

const getPositions = (tableSize: number) => {
  const allPositions = [
    "UTG",
    "UTG+1",
    "UTG+2",
    "UTG+3",
    "MP",
    "HJ",
    "CO",
    "BTN",
    "SB",
    "BB",
  ];
  if (tableSize <= 5) {
    return allPositions.slice(-tableSize);
  } else if (tableSize === 6) {
    return ["UTG", ...allPositions.slice(-5)];
  } else if (tableSize === 7) {
    return ["UTG", "UTG+1", ...allPositions.slice(-5)];
  } else if (tableSize === 8) {
    return ["UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO", "BTN", "SB"];
  } else if (tableSize === 9) {
    return ["UTG", "UTG+1", "UTG+2", "UTG+3", "MP", "HJ", "CO", "BTN", "SB"];
  } else {
    throw new Error("Invalid table size");
  }
};

const getPostFlopOrder = (tableSize: number) => {
  const positions = getPositions(tableSize);
  return [...positions.slice(-2), ...positions.slice(0, -2)];
};

type Card = {
  suit: string;
  rank: string;
};

type Action = {
  position: string;
  action: string;
  amount?: number;
};

type Street = {
  actions: Action[];
  pot: number;
  communityCards?: Card[];
  playerCards?: { [key: string]: Card[] };
};

type ChangeRound = {
  actions: Action[];
  discardedCards: Card[];
  drawnCards: Card[];
  pot: number;
  playerChanges: { [key: string]: number };
};

type HandHistory = {
  smallBlind: number;
  bigBlind: number;
  ante: number;
  smallBet?: number;
  bigBet?: number;
  tableSize: number;
  position: string;
  heroHands: Card[];
  streets: Street[];
  changeRounds?: ChangeRound[];
  villainHands: Card[][];
  villainPositions: string[];
  currentBet: number;
  effectiveStack: number;
  availableActions: {
    [key: string]: string[];
  };
};

const getAvailableCards = (currentCards: Card[]) => {
  const usedCards = currentCards.filter((card) => card.suit && card.rank);
  return {
    suits,
    ranks,
    isAvailable: (suit: string, rank: string) =>
      !usedCards.some((card) => card.suit === suit && card.rank === rank),
  };
};

type PokerHandHistoryFormProps = {
  gameName: string;
  handSize: number;
  isFixedLimit?: boolean;
  game_type: "flop" | "draw" | "stud";
  changeRoundCount?: number;
  studSpecific?: boolean;
};

const getActivePlayersAfterStreet = (actions: Action[]): string[] => {
  const activePlayers = new Set<string>();
  const foldedPlayers = new Set<string>();

  actions.forEach((action) => {
    if (action.action === "Fold") {
      foldedPlayers.add(action.position);
    } else {
      activePlayers.add(action.position);
    }
  });

  return Array.from(activePlayers).filter(
    (player) => !foldedPlayers.has(player)
  );
};

const getAvailableActions = (
  street: Action[],
  position: string,
  beforeActionStart?: boolean
): string[] => {
  const actions = ["Fold"];
  const hasBetBefore =
    beforeActionStart ||
    street.some(
      (action) =>
        action.position !== position &&
        (action.action === "Bet" || action.action === "Raise")
    );

  if (!hasBetBefore) {
    actions.push("Check", "Bet");
  } else {
    actions.push("Call", "Raise");
  }
  actions.push("All In");

  return actions;
};

export function PokerHandHistoryForm({
  gameName,
  handSize,
  isFixedLimit,
  game_type,
  changeRoundCount = 0,
}: PokerHandHistoryFormProps) {
  const [handHistory, setHandHistory] = useState<HandHistory>({
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    tableSize: 3, //6,
    position: "",
    heroHands: Array(handSize).fill({ suit: "", rank: "" }),
    streets:
      game_type === "flop"
        ? [
            { actions: [], pot: 0 },
            {
              actions: [],
              pot: 0,
              communityCards: [
                { suit: "", rank: "" },
                { suit: "", rank: "" },
                { suit: "", rank: "" },
              ],
            },
            { actions: [], pot: 0, communityCards: [{ suit: "", rank: "" }] },
            { actions: [], pot: 0, communityCards: [{ suit: "", rank: "" }] },
          ]
        : game_type === "draw"
          ? [{ actions: [], pot: 0 }]
          : [
              { actions: [], pot: 0, playerCards: {} }, // 3rd Street
              { actions: [], pot: 0, playerCards: {} }, // 4th Street
              { actions: [], pot: 0, playerCards: {} }, // 5th Street
              { actions: [], pot: 0, playerCards: {} }, // 6th Street
              { actions: [], pot: 0, playerCards: {} }, // 7th Street
            ],
    changeRounds:
      game_type === "draw"
        ? Array(changeRoundCount).fill({
            actions: [],
            discardedCards: [],
            drawnCards: [],
            pot: 0,
            playerChanges: {},
          })
        : undefined,
    villainHands: [],
    villainPositions: [],
    currentBet: 0,
    effectiveStack: 0,
    availableActions: {},
  });

  const [formattedHistory, setFormattedHistory] = useState<string>("");
  const [heroHanderrorMessages, setHeroHandErrorMessages] = useState(
    Array(handSize).fill("")
  );
  const [villainHandErrorMessages, setVillainHandErrorMessages] = useState(
    Array(handSize).fill("")
  );
  // const [flopErrorMessage, setFlopErrorMessage] = useState('');
  // const [turnErrorMessage, setTurnErrorMessage] = useState('');
  // const [riverErrorMessage, setRiverErrorMessage] = useState('');

  useEffect(() => {
    if (gameName === "No Limit Texas Hold'em") {
      setHandHistory((prev) => ({ ...prev, ante: prev.bigBlind }));
    } else if (gameName === "No Limit 2-7 Single Draw") {
      setHandHistory((prev) => ({
        ...prev,
        ante: Math.round(prev.bigBlind * 1.5),
      }));
    }
  }, [gameName, handHistory.bigBlind]);

  useEffect(() => {
    const positions = getPositions(handHistory.tableSize);
    //setActivePlayers(positions);
    setHandHistory((prev) => {
      const newHistory = {
        ...prev,
        streets: prev.streets.map((street, index) =>
          index === 0
            ? {
                ...street,
                actions: positions.map((pos) => ({
                  position: pos,
                  action: "",
                  amount: 0,
                })),
              }
            : street
        ),
        availableActions: Object.fromEntries(
          positions.map((pos) => [pos, getAvailableActions([], pos, true)])
        ),
        changeRounds: prev.changeRounds
          ? prev.changeRounds.map((round) => ({
              ...round,
              playerChanges: Object.fromEntries(
                positions.map((pos) => [pos, 0])
              ),
            }))
          : undefined,
      };
      return newHistory;
    });
  }, [handHistory.tableSize]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = Number(value);
    setHandHistory((prev) => {
      const newHistory = {
        ...prev,
        [name]: newValue,
        position: name === "tableSize" ? "" : prev.position,
      };
      if (name === "smallBlind") {
        newHistory.bigBlind = newValue * 2;
      }
      if (
        name === "smallBlind" ||
        name === "bigBlind" ||
        name === "ante" ||
        name === "effectiveStack"
      ) {
        newHistory.streets = newHistory.streets.map((street, index) => ({
          ...street,
          pot: calculatePot(
            street.actions,
            newHistory.smallBlind,
            newHistory.bigBlind,
            newHistory.ante,
            newHistory.tableSize,
            index === 0 ? 0 : newHistory.streets[index - 1].pot
          ),
        }));
      }
      return newHistory;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setHandHistory((prev) => ({ ...prev, [name]: value }));
  };

  const handleHeroHandChange = (index: number, value: string) => {
    const newHeroHand = {
      rank: value[0]?.toUpperCase() || "",
      suit: value[1]?.toLowerCase() || "",
    };

    setHandHistory((prev) => {
      const newHeroHands = [...prev.heroHands];
      newHeroHands[index] = newHeroHand;
      return { ...prev, heroHands: newHeroHands };
    });
  };

  const handleHeroHandBlur = (index: number, value: string) => {
    const newErrorMessages = [...heroHanderrorMessages];
    if (!isValidCard(value[0]?.toUpperCase(), value[1]?.toLowerCase())) {
      newErrorMessages[index] =
        "Invalid card input. Please enter valid cards (e.g. As, Kh).";
    } else {
      newErrorMessages[index] = "";
    }
    setHeroHandErrorMessages(newErrorMessages);
  };

  const isValidCard = (rank: string, suit: string): boolean => {
    const validSuits = ["s", "h", "d", "c"];
    const validRanks = [
      "A",
      "K",
      "Q",
      "J",
      "T",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ];
    return validSuits.includes(suit) && validRanks.includes(rank);
  };

  const getBetAmount = (streetIndex: number): number => {
    if (!isFixedLimit) return 0;
    const isSmallBettingRound = streetIndex <= 1;
    const baseAmount = isSmallBettingRound
      ? handHistory.bigBlind
      : handHistory.bigBlind * 2;
    return Math.max(handHistory.currentBet + baseAmount, baseAmount);
  };

  const handleActionChange = (
    index: number,
    field: keyof Action,
    value: string | number,
    streetIndex: number
  ) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };
      let newActions: Action[];

      if (game_type === "draw" && newHistory.changeRounds) {
        newActions = [...(newHistory.changeRounds[streetIndex]?.actions || [])];
      } else {
        newActions = [...(newHistory.streets[streetIndex]?.actions || [])];
      }

      let newAmount = newActions[index]?.amount || 0;

      if (field === "action") {
        if (value === "Call") {
          const lastRaiseOrBet = [...newActions]
            .reverse()
            .find((a) => a.action === "Raise" || a.action === "Bet");
          newAmount = lastRaiseOrBet
            ? lastRaiseOrBet.amount || 0
            : newHistory.currentBet;
        } else if (value === "Bet" || value === "Raise") {
          if (isFixedLimit) {
            newAmount = getBetAmount(streetIndex);
            //setBetRaiseCount(prevCount => ({
            //  ...prevCount,
            //  [streetIndex]: prevCount[streetIndex] + 1
            //}));
          } else {
            newAmount = 0;
          }
        } else if (value === "All In") {
          newAmount = 0;
        } else {
          newAmount = 0;
        }
      } else if (field === "amount" && !isFixedLimit) {
        newAmount = value as number;
      }

      newActions[index] = {
        ...newActions[index],
        [field]: value,
        amount: newAmount,
      };

      if (game_type === "draw" && newHistory.changeRounds) {
        newHistory.changeRounds[streetIndex].actions = newActions;
      } else {
        newHistory.streets[streetIndex].actions = newActions;
      }
      if (value === "Bet" || value === "Raise") {
        newHistory.currentBet = newAmount;
      }

      type AvailableActions = {
        UTG: string[];
        UTG1: string[];
        UTG2: string[];
        UTG3: string[];
        MP: string[];
        HJ: string[];
        CO: string[];
        BTN: string[];
        SB: string[];
        BB: string[];
      };

      const updatedAvailableActions: AvailableActions = {
        UTG: [],
        UTG1: [],
        UTG2: [],
        UTG3: [],
        MP: [],
        HJ: [],
        CO: [],
        BTN: [],
        SB: [],
        BB: [],
      };

      (game_type === "draw" && newHistory.changeRounds
        ? newHistory.changeRounds[streetIndex].actions
        : newHistory.streets[streetIndex].actions
      ).forEach((action, i) => {
        const targetAction: keyof AvailableActions =
          action.position as keyof AvailableActions;
        updatedAvailableActions[targetAction] = getAvailableActions(
          (game_type === "draw" && newHistory.changeRounds
            ? newHistory.changeRounds[streetIndex].actions
            : newHistory.streets[streetIndex].actions
          ).slice(0, i),
          action.position,
          streetIndex === 0
        );
      });
      newHistory.availableActions = updatedAvailableActions;

      // ポットの再計算
      newHistory.streets = newHistory.streets.map((street, i) => ({
        ...street,
        pot: calculatePot(
          street.actions,
          newHistory.smallBlind,
          newHistory.bigBlind,
          newHistory.ante,
          newHistory.tableSize,
          i === 0 ? 0 : newHistory.streets[i - 1].pot
        ),
      }));

      return newHistory;
    });
  };

  const handleStreetActions = (streetIndex: number) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };

      let allActions: Action[];

      if (game_type === "draw" && newHistory.changeRounds) {
        allActions = newHistory.changeRounds.flatMap((round) => round.actions);
      } else {
        allActions = newHistory.streets.flatMap((street) => street.actions);
      }

      const activePositions = getActivePlayersAfterStreet(allActions);
      const positions =
        streetIndex === 0
          ? getPositions(newHistory.tableSize)
          : getPostFlopOrder(newHistory.tableSize);
      const orderedActivePositions = positions.filter((pos) =>
        activePositions.includes(pos)
      );

      const existingActions =
        game_type === "draw" && newHistory.changeRounds
          ? newHistory.changeRounds[streetIndex].actions
          : newHistory.streets[streetIndex].actions;

      const newActions = orderedActivePositions.map((pos) => ({
        position: pos,
        action: "",
        amount: 0,
      }));

      const combinedActions = [...existingActions, ...newActions];

      if (game_type === "draw" && newHistory.changeRounds) {
        newHistory.changeRounds[streetIndex].actions = combinedActions;
      } else {
        newHistory.streets[streetIndex].actions = combinedActions;
      }

      // activeなプレイヤーごとにavailableActionsを更新
      orderedActivePositions.forEach((pos) => {
        const availableActions = getAvailableActions(
          game_type === "draw" && newHistory.changeRounds
            ? newHistory.changeRounds[streetIndex].actions
            : newHistory.streets[streetIndex].actions,
          pos
        );

        newHistory.availableActions = {
          ...newHistory.availableActions,
          [pos]: availableActions,
        };
      });

      //const availableActions = getAvailableActions(
      //  game_type === "draw" && newHistory.changeRounds
      //    ? newHistory.changeRounds[streetIndex].actions
      //    : newHistory.streets[streetIndex].actions,
      //  newAction.position,
      //  streetIndex === 0
      //);

      //// availableActionsを更新
      //newHistory.availableActions = {
      //  ...newHistory.availableActions,
      //  [newAction.position]: availableActions,
      //};

      return newHistory;
    });
  };

  const handleDeleteAction = (index: number, streetIndex: number) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };

      if (game_type === "draw" && newHistory.changeRounds) {
        newHistory.changeRounds[streetIndex].actions =
          newHistory.changeRounds[streetIndex]?.actions.filter(
            (_, i) => i !== index
          ) || [];
      } else {
        newHistory.streets[streetIndex].actions =
          newHistory.streets[streetIndex]?.actions.filter(
            (_, i) => i !== index
          ) || [];
      }

      // ポットの再計算
      newHistory.streets = newHistory.streets.map((street, i) => ({
        ...street,
        pot: calculatePot(
          street.actions,
          newHistory.smallBlind,
          newHistory.bigBlind,
          newHistory.ante,
          newHistory.tableSize,
          i === 0 ? 0 : newHistory.streets[i - 1].pot
        ),
      }));

      return newHistory;
    });
  };

  const getAvailablePositions = () => {
    const allActions = handHistory.streets.flatMap((street) => street.actions);
    const activePlayers = getActivePlayersAfterStreet(allActions);
    return activePlayers.filter((pos) => pos !== handHistory.position);
  };

  const addVillainHand = () => {
    const availablePositions = getAvailablePositions();
    if (availablePositions.length > 0) {
      setHandHistory((prev) => ({
        ...prev,
        villainHands: [
          ...prev.villainHands,
          Array(handSize).fill({ suit: "", rank: "" }),
        ],
        villainPositions: [...prev.villainPositions, availablePositions[0]],
      }));
    } else {
      alert("No more active positions available for villains.");
    }
  };

  const handleVillainPositionChange = (index: number, position: string) => {
    setHandHistory((prev) => {
      const newVillainPositions = [...prev.villainPositions];
      newVillainPositions[index] = position;
      return { ...prev, villainPositions: newVillainPositions };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = formatHandHistory(handHistory);
    setFormattedHistory(formatted);
  };

  const setAnteEqualToBB = () => {
    setHandHistory((prev) => {
      const newHistory = { ...prev, ante: prev.bigBlind };
      newHistory.streets = newHistory.streets.map((street, index) => ({
        ...street,
        pot: calculatePot(
          street.actions,
          newHistory.smallBlind,
          newHistory.bigBlind,
          newHistory.ante,
          newHistory.tableSize,
          index === 0 ? 0 : newHistory.streets[index - 1].pot
        ),
      }));
      return newHistory;
    });
  };

  const getAllCards = () => {
    return [
      ...handHistory.heroHands,
      ...handHistory.streets.flatMap((street) => street.communityCards || []),
      ...(handHistory.changeRounds?.flatMap((round) => round.drawnCards) || []),
      ...handHistory.villainHands.flat(),
    ].filter(
      (card) => card.suit && card.rank && card.suit !== "" && card.rank !== ""
    );
  };

  const calculatePot = (
    actions: Action[],
    smallBlind: number,
    bigBlind: number,
    ante: number,
    tableSize: number,
    previousPot: number = 0
  ) => {
    let initialPot = previousPot;
    if (previousPot === 0) {
      initialPot = smallBlind + bigBlind + ante * tableSize;
    }
    return actions.reduce((total, action) => {
      if (action.action === "Bet" || action.action === "Raise") {
        return total + (action.amount || 0);
      } else if (action.action === "Call") {
        if (action.position === "SB" && previousPot === 0) {
          return total + ((action.amount || 0) - smallBlind);
        } else if (action.position === "BB" && previousPot === 0) {
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
    formatted += `Hero: ${history.position}, ${history.heroHands.map((card) => card.suit + card.rank).join("")}\n`;

    // アクションの略称マッピングを追加
    const actionAbbreviations: { [key: string]: string } = {
      Fold: "f",
      Raise: "r",
      Call: "c",
      Check: "c",
      Bet: "b",
      "All In": "AI",
    };

    const streetNames =
      game_type === "draw"
        ? [
            "Pre-Draw",
            ...Array(changeRoundCount)
              .fill("")
              .map((_, i) => `Draw ${i + 1}`),
            "Showdown",
          ]
        : game_type === "flop"
          ? ["Preflop", "Flop", "Turn", "River"]
          : [
              "Pre-Flop",
              "3rd Street",
              "4th Street",
              "5th Street",
              "6th Street",
              "7th Street",
            ];

    history.streets.forEach((street, index) => {
      formatted += `${streetNames[index]}:\n`;
      if (street.communityCards && street.communityCards.length > 0) {
        formatted += `${street.communityCards.map((card) => card.suit + card.rank).join("")} (${index === 0 ? history.streets[0].pot : history.streets[index - 1].pot})\n\n`;
      }
      street.actions.forEach((action) => {
        formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ""}\n`;
      });
      formatted += "\n";
    });

    if (game_type === "draw" && history.changeRounds) {
      history.changeRounds.forEach((round, index) => {
        formatted += `Draw ${index + 1}:\n`;
        Object.entries(round.playerChanges).forEach(([position, count]) => {
          formatted += `${position}: ${count}\n`;
        });
        formatted += `Hero discards: ${round.discardedCards.map((card) => card.suit + card.rank).join(", ")}\n`;
        formatted += `Hero draws: ${round.drawnCards.map((card) => card.suit + card.rank).join(", ")}\n`;
        round.actions.forEach((action) => {
          formatted += `${action.position}: ${actionAbbreviations[action.action] || action.action} ${action.amount || ""}\n`;
        });
        formatted += "\n";
      });
    }

    // Villain hands
    history.villainHands.forEach((hand, index) => {
      formatted += `Villain ${history.villainPositions[index]}: ${hand.map((card) => card.suit + card.rank).join("")}\n`;
    });

    return formatted;
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(formattedHistory)
      .then(() => {
        alert("Hand history copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const shareToX = () => {
    const shareText = `${formattedHistory.slice(0, 200)}...`;
    const shareUrl = "https://yourpokerapp.com"; // Replace with your actual app URL

    if (navigator.share) {
      navigator
        .share({
          title: "My Poker Hand History",
          text: shareText,
          url: shareUrl,
        })
        .then(() => {
          console.log("Successfully shared");
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          // Fallback to opening a new window with X (Twitter) intent URL
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            "_blank"
          );
        });
    } else {
      // Fallback for browsers that don't support Web Share API
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    }
  };

  const handleDiscardCardChange = (
    cardIndex: number,
    isDiscarded: boolean,
    roundIndex: number
  ) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };
      if (newHistory.changeRounds) {
        const card = newHistory.heroHands[cardIndex];
        if (isDiscarded) {
          newHistory.changeRounds[roundIndex].discardedCards.push(card);
        } else {
          newHistory.changeRounds[roundIndex].discardedCards =
            newHistory.changeRounds[roundIndex].discardedCards.filter(
              (c) => c !== card
            );
        }
      }
      return newHistory;
    });
  };

  const handleAddDrawnCard = (roundIndex: number) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };
      if (newHistory.changeRounds) {
        newHistory.changeRounds[roundIndex].drawnCards.push({
          suit: "",
          rank: "",
        });
      }
      return newHistory;
    });
  };

  const handlePlayerChangeCount = (
    position: string,
    count: number,
    roundIndex: number
  ) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };
      if (newHistory.changeRounds) {
        newHistory.changeRounds[roundIndex].playerChanges[position] = count;
      }
      return newHistory;
    });
  };

  // const handleVillainHandChange = (value: string, handIndex: number) => {
  //   const cards = value.match(/.{1,2}/g) || [];
  //   const newHand = cards.map((card) => {
  //     const rank = card[0]?.toUpperCase();
  //     const suit = card[1]?.toLowerCase();
  //     // return isValidCard(rank, suit) ? { rank, suit } : { rank: '', suit: '' };

  //     return { rank, suit };
  //   });

  //   setHandHistory((prev) => {
  //     const newVillainHands = [...prev.villainHands];
  //     newVillainHands[handIndex] = newHand.concat(
  //       Array(handSize - newHand.length).fill({ rank: "", suit: "" })
  //     );
  //     return { ...prev, villainHands: newVillainHands };
  //   });
  // };

  const handleCardChange = (
    cardIndex: number,
    field: "suit" | "rank",
    value: string,
    cardType: "hand" | "communityCards" | "drawnCards" | "playerCards",
    streetIndex?: number,
    roundIndex?: number
  ) => {
    setHandHistory((prev) => {
      const newHistory = { ...prev };
      if (cardType === "hand") {
        newHistory.heroHands[cardIndex] = {
          ...newHistory.heroHands[cardIndex],
          [field]: value,
        };
      } else if (cardType === "communityCards") {
        const newStreets = [...newHistory.streets];
        newStreets[streetIndex!].communityCards![cardIndex] = {
          ...newStreets[streetIndex!].communityCards![cardIndex],
          [field]: value,
        };
        newHistory.streets = newStreets;
      } else if (cardType === "drawnCards" && newHistory.changeRounds) {
        newHistory.changeRounds[roundIndex!].drawnCards[cardIndex] = {
          ...newHistory.changeRounds[roundIndex!].drawnCards[cardIndex],
          [field]: value,
        };
      } else if (game_type === "stud" && cardType === "playerCards") {
        // TODO: Implement playerCards for stud games
        //newHistory.streets[streetIndex!].playerCards[position!] = newHistory.streets[streetIndex!].playerCards[position!] || [];
        //newHistory.streets[streetIndex!].playerCards[position!][cardIndex] = {
        //  ...newHistory.streets[streetIndex!].playerCards[position!][cardIndex],
        //  [field]: value
        //};
      }
      return newHistory;
    });
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{gameName}</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Table Information</h2>
          <div className="flex flex-col space-y-4">
            <div>
              <Label htmlFor="smallBlind">Small Blind</Label>
              <Input
                type="number"
                id="smallBlind"
                name="smallBlind"
                value={handHistory.smallBlind}
                onChange={handleInputChange}
                min={0}
                onFocus={(e) => e.target.value === "0" && e.target.select()}
              />
            </div>
            <div>
              <Label htmlFor="bigBlind">Big Blind</Label>
              <Input
                type="number"
                id="bigBlind"
                name="bigBlind"
                value={handHistory.bigBlind}
                onChange={handleInputChange}
                min={0}
                onFocus={(e) => e.target.value === "0" && e.target.select()}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="ante">BB Ante</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  id="ante"
                  name="ante"
                  value={handHistory.ante}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setHandHistory((prev) => ({
                      ...prev,
                      ante: newValue,
                    }));
                  }}
                  min={0}
                  onFocus={(e) => e.target.value === "0" && e.target.select()}
                />
                <Button type="button" onClick={setAnteEqualToBB}>
                  Set Equal to BB
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="effectiveStack">Effective Stack</Label>
              <Input
                type="number"
                id="effectiveStack"
                name="effectiveStack"
                value={handHistory.effectiveStack}
                onChange={handleInputChange}
                min={0}
                onFocus={(e) => e.target.value === "0" && e.target.select()}
              />
            </div>
            {isFixedLimit && (
              <>
                <div>
                  <Label>Small Bet</Label>
                  <div className="text-lg font-semibold">
                    {handHistory.bigBlind}
                  </div>
                </div>
                <div>
                  <Label>Big Bet</Label>
                  <div className="text-lg font-semibold">
                    {handHistory.bigBlind * 2}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col space-y-4">
            <div>
              <Label htmlFor="tableSize">Table Size</Label>
              <Input
                type="number"
                id="tableSize"
                name="tableSize"
                value={handHistory.tableSize}
                onChange={handleInputChange}
                min={2}
                max={9}
                onFocus={(e) => e.target.value === "0" && e.target.select()}
              />
            </div>
            <div>
              <Label htmlFor="position">Hero Position</Label>
              <Select
                onValueChange={(value) => handleSelectChange("position", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  {getPositions(handHistory.tableSize).map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Hero Hand</h2>
          <Label>Enter Hero card (e.g. As, Kh)</Label>
          {Array.from({ length: handSize }).map((_, index) => (
            <div key={index}>
              <Input
                id={`hand-${index}`}
                placeholder="Enter card (e.g. As, Kh)"
                value={`${handHistory.heroHands[index]?.rank}${handHistory.heroHands[index]?.suit}`}
                onChange={(e) => handleHeroHandChange(index, e.target.value)}
                onBlur={(e) => handleHeroHandBlur(index, e.target.value)}
              />
              {heroHanderrorMessages[index] && (
                <p className="text-red-500">{heroHanderrorMessages[index]}</p>
              )}
            </div>
          ))}
        </div>

        {handHistory.streets.map((street, streetIndex) => (
          <div key={streetIndex} className="space-y-4">
            <h2 className="text-2xl font-bold">
              {game_type === "stud"
                ? streetIndex === 0
                  ? "3rd Street"
                  : streetIndex === 1
                    ? "4th Street"
                    : streetIndex === 2
                      ? "5th Street"
                      : streetIndex === 3
                        ? "6th Street"
                        : "7th Street"
                : game_type === "draw"
                  ? streetIndex === 0
                    ? "Pre-Draw"
                    : `Draw ${streetIndex}`
                  : streetIndex === 0
                    ? "Preflop"
                    : streetIndex === 1
                      ? "Flop"
                      : streetIndex === 2
                        ? "Turn"
                        : "River"}
            </h2>
            {game_type === "flop" && streetIndex > 0 && (
              <div className="space-y-4">
                <Label htmlFor={`communityCards-${streetIndex}`}>
                  Community Cards
                </Label>
                <div className="flex space-x-2">
                  {street.communityCards?.map((card, cardIndex) => (
                    <Input
                      key={cardIndex}
                      id={`communityCards-${streetIndex}-${cardIndex}`}
                      placeholder="Card"
                      value={`${card.rank}${card.suit}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        const newRank = value[0]?.toUpperCase() || "";
                        const newSuit = value[1]?.toLowerCase() || "";
                        handleCardChange(
                          cardIndex,
                          "rank",
                          newRank,
                          "communityCards",
                          streetIndex
                        );
                        handleCardChange(
                          cardIndex,
                          "suit",
                          newSuit,
                          "communityCards",
                          streetIndex
                        );
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const rank = value[0]?.toUpperCase();
                        const suit = value[1]?.toLowerCase();
                        if (!isValidCard(rank, suit)) {
                          handleCardChange(
                            cardIndex,
                            "rank",
                            "",
                            "communityCards",
                            streetIndex
                          );
                          handleCardChange(
                            cardIndex,
                            "suit",
                            "",
                            "communityCards",
                            streetIndex
                          );
                        }
                      }}
                      maxLength={2}
                    />
                  ))}
                </div>
              </div>
            )}
            {street.actions.map((action, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{action.position}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAction(index, streetIndex)}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
                <RadioGroup
                  onValueChange={(value) => {
                    handleActionChange(index, "action", value, streetIndex);
                  }}
                  value={action.action}
                >
                  <div className="flex flex-wrap gap-4">
                    {handHistory.availableActions[action.position]?.map(
                      (act) => (
                        <div key={act} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={act}
                            id={`${streetIndex}-${index}-${act}`}
                          />
                          <Label htmlFor={`${streetIndex}-${index}-${act}`}>
                            {act}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
                </RadioGroup>
                {(action.action === "Bet" ||
                  action.action === "Raise" ||
                  action.action === "Call" ||
                  action.action === "All In") && (
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={action.amount !== undefined ? action.amount : ""}
                    onChange={(e) =>
                      handleActionChange(
                        index,
                        "amount",
                        Number(e.target.value),
                        streetIndex
                      )
                    }
                    min={0}
                    disabled={
                      (action.action === "Call" && !isFixedLimit) ||
                      (isFixedLimit && action.action !== "All In")
                    }
                    onFocus={(e) => e.target.value === "0" && e.target.select()}
                  />
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleStreetActions(streetIndex);
              }}
            >
              Add Action
            </Button>
            <div>Pot: {street.pot}</div>
            {game_type === "stud" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Player Cards</h3>
                {Object.entries(street.playerCards || {}).map(
                  ([position, cards]) => (
                    <div key={position} className="space-y-2">
                      <Label>{position}</Label>
                      <div className="flex space-x-2">
                        {cards.map((card, cardIndex) => (
                          <div key={cardIndex} className="flex space-x-2">
                            <Select
                              onValueChange={(value) =>
                                handleCardChange(
                                  cardIndex,
                                  "suit",
                                  value,
                                  "playerCards",
                                  streetIndex
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Suit" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableCards(getAllCards()).suits.map(
                                  (suit) => (
                                    <SelectItem
                                      key={suit}
                                      value={suit}
                                      disabled={
                                        !getAvailableCards(
                                          getAllCards()
                                        ).isAvailable(suit, card.rank)
                                      }
                                    >
                                      {suit}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <Select
                              onValueChange={(value) =>
                                handleCardChange(
                                  cardIndex,
                                  "rank",
                                  value,
                                  "playerCards",
                                  streetIndex
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Rank" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableCards(getAllCards()).ranks.map(
                                  (rank) => (
                                    <SelectItem
                                      key={rank}
                                      value={rank}
                                      disabled={
                                        !getAvailableCards(
                                          getAllCards()
                                        ).isAvailable(card.suit, rank)
                                      }
                                    >
                                      {rank}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {game_type === "draw" &&
          handHistory.changeRounds &&
          handHistory.changeRounds.map((round, roundIndex) => (
            <div key={roundIndex} className="space-y-4">
              <h2 className="text-2xl font-bold">
                Change Round {roundIndex + 1}
              </h2>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Player Changes</h3>
                {Object.entries(round.playerChanges).map(
                  ([position, count]) => (
                    <div key={position} className="flex items-center space-x-2">
                      <Label>{position}</Label>
                      <Input
                        type="number"
                        value={count}
                        onChange={(e) =>
                          handlePlayerChangeCount(
                            position,
                            Number(e.target.value),
                            roundIndex
                          )
                        }
                        min={0}
                        max={handSize}
                      />
                    </div>
                  )
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Discard Cards</h3>
                {handHistory.heroHands.map((card, cardIndex) => (
                  <div key={cardIndex} className="flex items-center space-x-2">
                    <Checkbox
                      id={`discard-${roundIndex}-${cardIndex}`}
                      onCheckedChange={(checked) =>
                        handleDiscardCardChange(
                          cardIndex,
                          checked as boolean,
                          roundIndex
                        )
                      }
                    />
                    <Label htmlFor={`discard-${roundIndex}-${cardIndex}`}>
                      {card.suit}
                      {card.rank}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Drawn Cards</h3>
                {round.drawnCards.map((card, cardIndex) => (
                  <div key={cardIndex} className="flex space-x-2">
                    <Select
                      onValueChange={(value) =>
                        handleCardChange(
                          cardIndex,
                          "suit",
                          value,
                          "drawnCards",
                          undefined,
                          roundIndex
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Suit" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCards(getAllCards()).suits.map((suit) => (
                          <SelectItem
                            key={suit}
                            value={suit}
                            disabled={
                              !getAvailableCards(getAllCards()).isAvailable(
                                suit,
                                card.rank
                              )
                            }
                          >
                            {suit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      onValueChange={(value) =>
                        handleCardChange(
                          cardIndex,
                          "rank",
                          value,
                          "drawnCards",
                          undefined,
                          roundIndex
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCards(getAllCards()).ranks.map((rank) => (
                          <SelectItem
                            key={rank}
                            value={rank}
                            disabled={
                              !getAvailableCards(getAllCards()).isAvailable(
                                card.suit,
                                rank
                              )
                            }
                          >
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => handleAddDrawnCard(roundIndex)}
                >
                  Add Drawn Card
                </Button>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Betting Round</h3>
                {round.actions.map((action, index) => (
                  <div key={index} className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>{action.position}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAction(index, roundIndex)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                    <RadioGroup
                      onValueChange={(value) =>
                        handleActionChange(index, "action", value, roundIndex)
                      }
                      value={action.action}
                    >
                      <div className="flex flex-wrap gap-4">
                        {handHistory.availableActions[action.position]?.map(
                          (act) => (
                            <div
                              key={act}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={act}
                                id={`changeRound-${roundIndex}-${index}-${act}`}
                              />
                              <Label
                                htmlFor={`changeRound-${roundIndex}-${index}-${act}`}
                              >
                                {act}
                              </Label>
                            </div>
                          )
                        )}
                      </div>
                    </RadioGroup>
                    {(action.action === "Bet" ||
                      action.action === "Raise" ||
                      action.action === "Call" ||
                      action.action === "All In") && (
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={action.amount !== undefined ? action.amount : ""}
                        onChange={(e) =>
                          handleActionChange(
                            index,
                            "amount",
                            Number(e.target.value),
                            roundIndex
                          )
                        }
                        min={0}
                        disabled={
                          (action.action === "Call" && !isFixedLimit) ||
                          (isFixedLimit && action.action !== "All In")
                        }
                        onFocus={(e) =>
                          e.target.value === "0" && e.target.select()
                        }
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => handleStreetActions(roundIndex)}
                >
                  Add Action
                </Button>
              </div>
              <div>Pot: {round.pot}</div>
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
                    //document.activeElement instanceof HTMLElement && document.activeElement.blur();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Position">
                      {handHistory.villainPositions[handIndex]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePositions().map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Villain Hand</Label>
                {Array.from({ length: handSize }).map((_, cardIndex) => (
                  <div key={cardIndex}>
                    <Input
                      id={`villainHand-${handIndex}-${cardIndex}`}
                      placeholder="Enter card (e.g. As, Kh)"
                      value={`${hand[cardIndex]?.rank}${hand[cardIndex]?.suit}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        const newRank = value[0]?.toUpperCase();
                        const newSuit = value[1]?.toLowerCase();
                        setHandHistory((prev) => {
                          const newVillainHands = [...prev.villainHands];
                          newVillainHands[handIndex][cardIndex] = {
                            rank: newRank,
                            suit: newSuit,
                          };
                          return { ...prev, villainHands: newVillainHands };
                        });
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const rank = value[0]?.toUpperCase();
                        const suit = value[1]?.toLowerCase();
                        if (!isValidCard(rank, suit)) {
                          setHandHistory((prev) => {
                            const newVillainHands = [...prev.villainHands];
                            newVillainHands[handIndex][cardIndex] = {
                              rank: "",
                              suit: "",
                            };
                            return { ...prev, villainHands: newVillainHands };
                          });
                          const newErrorMessages = [
                            ...villainHandErrorMessages,
                          ];
                          newErrorMessages[handIndex] =
                            "Invalid card input. Please enter valid cards (e.g. As, Kh).";
                          setVillainHandErrorMessages(newErrorMessages);
                        } else {
                          const newErrorMessages = [
                            ...villainHandErrorMessages,
                          ];
                          newErrorMessages[handIndex] = "";
                          setVillainHandErrorMessages(newErrorMessages);
                        }
                      }}
                    />
                    {villainHandErrorMessages[handIndex] && (
                      <p className="text-red-500">
                        {villainHandErrorMessages[handIndex]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => {
              setVillainHandErrorMessages([]);
              addVillainHand();
            }}
          >
            Add Villain Hand
          </Button>
        </div>

        <Button type="submit">Save Hand History</Button>
      </form>
      {formattedHistory && (
        <div className="mt-8">
          <div className="space-y-4 mb-4">
            <h2 className="text-2xl font-bold">Formatted Hand History</h2>
            <div className="flex gap-4">
              <Button
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                <ClipboardIcon className="w-4 h-4" />
                Copy
              </Button>
              <Button onClick={shareToX} className="flex items-center gap-2">
                <Share2Icon className="w-4 h-4" />
                Share to X
              </Button>
            </div>
          </div>
          <pre className="bg-[#f5f5f5] p-4 rounded-md overflow-x-auto">
            <code>{formattedHistory}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
