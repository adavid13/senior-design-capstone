import Command from './Command';
import { createPiece } from '../PieceFactory';
import { Events } from '../EventCenter';

const execute = function () {
  const { board, selectedCard, tileXY } = this.value;
  const type = selectedCard.getType();
  const player = selectedCard.getPlayer();
  const faction = selectedCard.getFaction();
  const piece = createPiece(type, { board, player, tileXY, faction });
  player.removePieceFromHand(type);
  selectedCard.setVisible(false);
  Events.emit('piece-added', piece);
};

const undo = function () {
  const { board, selectedCard, tileXY } = this.value;
  board.removeChess(null, tileXY.x, tileXY.y, 'pathfinderLayer', true);
  selectedCard.setVisible(true);
  Events.emit('piece-removed', tileXY);
};

const PlaceCommand = function (value) {
  return new Command(execute, undo, value);
};

export default PlaceCommand;