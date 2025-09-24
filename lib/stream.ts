import Alpaca from '@alpacahq/alpaca-trade-api'
import alpaca from './alpaca'

export function initSocket(onUpdate: (msg: any) => void) {
  const socket = alpaca.trade_ws
  socket.onConnect(() => socket.subscribe(['trade_updates', 'account_updates']))
  socket.onOrderUpdate(onUpdate)
  socket.connect()
  return () => socket.disconnect()
}

