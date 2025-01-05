'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const suits = ['♠', '♥', '♦', '♣']
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const actions = ['Fold', 'Check', 'Call', 'Bet', 'Raise', 'All-In']

const getPositions = (tableSize: number) => {
  const allPositions = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return allPositions.slice(-tableSize);
}

type Card = {
  suit: string
  rank: string
}

type Action = {
  position: string
  action: string
  amount?: number
}

type ChangeRound = {
  actions: Action[]
  discardedCards: Card[]
  drawnCards: Card[]
  pot: number
}

type HandHistory = {
  smallBlind: number
  bigBlind: number
  ante: number
  tableSize: number
  position: string
  hand: Card[]
  preDrawActions: Action[]
  preDrawPot: number
  changeRounds: ChangeRound[]
  showdownActions: Action[]
  showdownPot: number
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

type DrawGameHandHistoryFormProps = {
  gameName: string
  handSize: number
  changeRoundCount: number
}

export function DrawGameHandHistoryForm({ gameName, handSize, changeRoundCount }: DrawGameHandHistoryFormProps) {
  const [handHistory, setHandHistory] = useState<HandHistory>({
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    tableSize: 6,
    position: '',
    hand: Array(handSize).fill({ suit: '', rank: '' }),
    preDrawActions: [],
    preDrawPot: 0,
    changeRounds: Array(changeRoundCount).fill({
      actions: [],
      discardedCards: [],
      drawnCards: [],
      pot: 0
    }),
    showdownActions: [],
    showdownPot: 0
  })

  const [activePlayers, setActivePlayers] = useState<string[]>([])

  useEffect(() => {
    const positions = getPositions(handHistory.tableSize);
    setActivePlayers(positions);
    setHandHistory(prev => ({
      ...prev,
      preDrawActions: positions.map(pos => ({ position: pos, action: '', amount: 0 })),
    }))
  }, [handHistory.tableSize])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newValue = Number(value)
    setHandHistory(prev => ({
      ...prev,
      [name]: newValue,
      position: name === 'tableSize' ? '' : prev.position
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setHandHistory(prev => ({ ...prev, [name]: value }))
  }

  const handleCardChange = (index: number, field: 'suit' | 'rank', value: string, cardType: 'hand' | 'drawnCards', roundIndex?: number) => {
    setHandHistory(prev => {
      const newHistory = { ...prev }
      if (cardType === 'hand') {
        newHistory.hand[index] = {
          ...newHistory.hand[index],
          [field]: value
        }
      } else if (cardType === 'drawnCards' && roundIndex !== undefined) {
        newHistory.changeRounds[roundIndex].drawnCards[index] = {
          ...newHistory.changeRounds[roundIndex].drawnCards[index],
          [field]: value
        }
      }
      return newHistory
    })
  }

  const handleActionChange = (index: number, field: keyof Action, value: string | number, actionType: 'preDrawActions' | 'changeRoundActions' | 'showdownActions', roundIndex?: number) => {
    setHandHistory(prev => {
      const newHistory = { ...prev }
      let actions: Action[];
      
      if (actionType === 'preDrawActions') {
        actions = newHistory.preDrawActions;
      } else if (actionType === 'changeRoundActions' && roundIndex !== undefined) {
        actions = newHistory.changeRounds[roundIndex].actions;
      } else if (actionType === 'showdownActions') {
        actions = newHistory.showdownActions;
      } else {
        return prev;
      }
      
      if (field === 'action') {
        if (value === 'Call') {
          // Find the last raise or bet amount
          const lastRaiseOrBet = [...actions].reverse().find(a => a.action === 'Raise' || a.action === 'Bet');
          const callAmount = lastRaiseOrBet ? lastRaiseOrBet.amount : 0;
          actions[index] = { ...actions[index], action: value as string, amount: callAmount };
        } else {
          actions[index] = { ...actions[index], [field]: value, amount: 0 };
        }
      } else {
        actions[index] = { ...actions[index], [field]: value };
      }
      
      return newHistory;
    })

    if (field === 'action' && value === 'Fold') {
      setActivePlayers(prev => prev.filter(pos => {
        if (actionType === 'preDrawActions') {
          return pos !== handHistory.preDrawActions[index].position
        } else if (actionType === 'changeRoundActions' && roundIndex !== undefined) {
          return pos !== handHistory.changeRounds[roundIndex].actions[index].position
        } else if (actionType === 'showdownActions') {
          return pos !== handHistory.showdownActions[index].position
        }
        return true
      }))
    }
  }

  const handleDiscardCardChange = (cardIndex: number, isDiscarded: boolean, roundIndex: number) => {
    setHandHistory(prev => {
      const newHistory = { ...prev }
      const card = newHistory.hand[cardIndex]
      if (isDiscarded) {
        newHistory.changeRounds[roundIndex].discardedCards.push(card)
      } else {
        newHistory.changeRounds[roundIndex].discardedCards = newHistory.changeRounds[roundIndex].discardedCards.filter(c => c !== card)
      }
      return newHistory
    })
  }

  const handleAddDrawnCard = (roundIndex: number) => {
    setHandHistory(prev => {
      const newHistory = { ...prev }
      newHistory.changeRounds[roundIndex].drawnCards.push({ suit: '', rank: '' })
      return newHistory
    })
  }

  const handleAddAction = (actionType: 'preDrawActions' | 'changeRoundActions' | 'showdownActions', roundIndex?: number) => {
    const positions = getPositions(handHistory.tableSize);
    const activePositions = positions.filter(pos => activePlayers.includes(pos));

    setHandHistory(prev => {
      const newHistory = { ...prev }
      if (actionType === 'preDrawActions') {
        newHistory.preDrawActions = [
          ...newHistory.preDrawActions,
          ...activePositions.map(pos => ({ position: pos, action: '', amount: 0 }))
        ]
      } else if (actionType === 'changeRoundActions' && roundIndex !== undefined) {
        newHistory.changeRounds[roundIndex].actions = [
          ...newHistory.changeRounds[roundIndex].actions,
          ...activePositions.map(pos => ({ position: pos, action: '', amount: 0 }))
        ]
      } else if (actionType === 'showdownActions') {
        newHistory.showdownActions = [
          ...newHistory.showdownActions,
          ...activePositions.map(pos => ({ position: pos, action: '', amount: 0 }))
        ]
      }
      return newHistory
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log(handHistory)
  }

  const getAllCards = () => {
    return [
      ...handHistory.hand,
      ...handHistory.changeRounds.flatMap(round => round.drawnCards)
    ].filter(card => card.suit && card.rank);
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
              <Input type="number" id="smallBlind" name="smallBlind" value={handHistory.smallBlind} onChange={handleInputChange} min={0} />
            </div>
            <div>
              <Label htmlFor="bigBlind">Big Blind</Label>
              <Input type="number" id="bigBlind" name="bigBlind" value={handHistory.bigBlind} onChange={handleInputChange} min={0} />
            </div>
            <div>
              <Label htmlFor="ante">Ante</Label>
              <Input type="number" id="ante" name="ante" value={handHistory.ante} onChange={handleInputChange} min={0} />
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <div>
              <Label htmlFor="tableSize">Table Size</Label>
              <Input type="number" id="tableSize" name="tableSize" value={handHistory.tableSize} onChange={handleInputChange} min={2} max={10} />
            </div>
            <div>
              <Label htmlFor="position">Your Position</Label>
              <Select onValueChange={(value) => handleSelectChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  {getPositions(handHistory.tableSize).map((pos) => (
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

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Pre-Draw Actions</h2>
          {handHistory.preDrawActions.map((action, index) => (
            <div key={index} className="flex flex-col space-y-2">
              <Label>{action.position}</Label>
              <RadioGroup
                onValueChange={(value) => handleActionChange(index, 'action', value, 'preDrawActions')}
                value={action.action}
              >
                <div className="flex flex-wrap gap-4">
                  {actions.map((act) => (
                    <div key={act} className="flex items-center space-x-2">
                      <RadioGroupItem value={act} id={`preDraw-${index}-${act}`} />
                      <Label htmlFor={`preDraw-${index}-${act}`}>{act}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {(action.action === 'Bet' || action.action === 'Raise' || action.action === 'Call') && (
                <Input
                  type="number"
                  placeholder="Amount"
                  value={action.amount !== undefined ? action.amount : ''}
                  onChange={(e) => handleActionChange(index, 'amount', Number(e.target.value), 'preDrawActions')}
                  min={0}
                  disabled={action.action === 'Call'}
                />
              )}
            </div>
          ))}
          <Button type="button" onClick={() => handleAddAction('preDrawActions')}>Add Pre-Draw Action</Button>
          <div>Pre-Draw Pot: {handHistory.preDrawPot}</div>
        </div>

        {handHistory.changeRounds.map((round, roundIndex) => (
          <div key={roundIndex} className="space-y-4">
            <h2 className="text-2xl font-bold">Change Round {roundIndex + 1}</h2>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Discard Cards</h3>
              {handHistory.hand.map((card, cardIndex) => (
                <div key={cardIndex} className="flex items-center space-x-2">
                  <Checkbox
                    id={`discard-${roundIndex}-${cardIndex}`}
                    onCheckedChange={(checked) => handleDiscardCardChange(cardIndex, checked as boolean, roundIndex)}
                  />
                  <Label htmlFor={`discard-${roundIndex}-${cardIndex}`}>
                    {card.suit}{card.rank}
                  </Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Drawn Cards</h3>
              {round.drawnCards.map((card, cardIndex) => (
                <div key={cardIndex} className="flex space-x-2">
                  <Select onValueChange={(value) => handleCardChange(cardIndex, 'suit', value, 'drawnCards', roundIndex)}>
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
                  <Select onValueChange={(value) => handleCardChange(cardIndex, 'rank', value, 'drawnCards', roundIndex)}>
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
              <Button type="button" onClick={() => handleAddDrawnCard(roundIndex)}>Add Drawn Card</Button>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Actions</h3>
              {round.actions.map((action, actionIndex) => (
                <div key={actionIndex} className="flex flex-col space-y-2">
                  <Label>{action.position}</Label>
                  <RadioGroup
                    onValueChange={(value) => handleActionChange(actionIndex, 'action', value, 'changeRoundActions', roundIndex)}
                    value={action.action}
                  >
                    <div className="flex flex-wrap gap-4">
                      {actions.map((act) => (
                        <div key={act} className="flex items-center space-x-2">
                          <RadioGroupItem value={act} id={`changeRound-${roundIndex}-${actionIndex}-${act}`} />
                          <Label htmlFor={`changeRound-${roundIndex}-${actionIndex}-${act}`}>{act}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {(action.action === 'Bet' || action.action === 'Raise' || action.action === 'Call') && (
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={action.amount !== undefined ? action.amount : ''}
                      onChange={(e) => handleActionChange(actionIndex, 'amount', Number(e.target.value), 'changeRoundActions', roundIndex)}
                      min={0}
                      disabled={action.action === 'Call'}
                    />
                  )}
                </div>
              ))}
              <Button type="button" onClick={() => handleAddAction('changeRoundActions', roundIndex)}>Add Action</Button>
            </div>
            <div>Change Round {roundIndex + 1} Pot: {round.pot}</div>
          </div>
        ))}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Showdown</h2>
          {handHistory.showdownActions.map((action, index) => (
            <div key={index} className="flex flex-col space-y-2">
              <Label>{action.position}</Label>
              <RadioGroup
                onValueChange={(value) => handleActionChange(index, 'action', value, 'showdownActions')}
                value={action.action}
              >
                <div className="flex flex-wrap gap-4">
                  {actions.map((act) => (
                    <div key={act} className="flex items-center space-x-2">
                      <RadioGroupItem value={act} id={`showdown-${index}-${act}`} />
                      <Label htmlFor={`showdown-${index}-${act}`}>{act}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {(action.action === 'Bet' || action.action === 'Raise' || action.action === 'Call') && (
                <Input
                  type="number"
                  placeholder="Amount"
                  value={action.amount !== undefined ? action.amount : ''}
                  onChange={(e) => handleActionChange(index, 'amount', Number(e.target.value), 'showdownActions')}
                  min={0}
                  disabled={action.action === 'Call'}
                />
              )}
            </div>
          ))}
          <Button type="button" onClick={() => handleAddAction('showdownActions')}>Add Showdown Action</Button>
          <div>Showdown Pot: {handHistory.showdownPot}</div>
        </div>

        <Button type="submit">Save Hand History</Button>
      </form>
    </div>
  )
}

