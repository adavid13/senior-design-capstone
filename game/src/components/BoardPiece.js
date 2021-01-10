import Phaser from 'phaser';
import graphlib, { Graph } from '@dagrejs/graphlib';
import MoveableMarker from './MoveableMarker';
import { Constants } from '../utils/constants';
// import { Constants } from '../utils/constants';

export default class BoardPiece extends Phaser.GameObjects.Image {
  constructor(board, tileXY, texture) {
    const scene = board.scene;
    const worldXY = board.tileXYToWorldXY(tileXY.x, tileXY.y);
    super(scene, worldXY.x, worldXY.y, texture);

    this.isBoardContinuous = this.isBoardContinuous.bind(this);
    this.reposition = this.reposition.bind(this);
    this.setOrigin(0.5);
    this.setScale(0.45);
    this.setDepth(5);
    scene.add.existing(this);
    board.addChess(this, tileXY.x, tileXY.y, 'pathfinderLayer');

    // add behaviors
    this.createPathfinder(scene);
    this.moveTo = scene.rexBoard.add.moveTo(this, { speed: 200 });
    this.moveTo.on('complete', this.reorderTiles, this);

    // private members
    this.movingPoints = 1;
    this.markers = [];
    this._displayName = 'BoardPiece';
    this.canOverlap = false;
  }

  set displayName(name) {
    this._displayName = name;
  }

  get displayName() {
    return this._displayName;
  }

  createPathfinder(scene) {
    this.pathFinder = scene.rexBoard.add.pathFinder(this, {
      occupiedTest: true,
      cacheCost: false,
      costCallback: function (curTile, preTile, pathFinder) {
        if (!this.canSlide(this, curTile, preTile, pathFinder)) {
          return pathFinder.BLOCKER;
        }
        return 1;
      },
      costCallbackScope: this,
    });
  }

  showMoveableArea() {
    this.hideMoveableArea();
    let tileXYArray = this.pathFinder.findArea(this.movingPoints);
    for (let i = 0, cnt = tileXYArray.length; i < cnt; i++) {
      this.markers.push(new MoveableMarker(this, tileXYArray[i]));
    }
    return this;
  }

  hideMoveableArea() {
    for (let i = 0, cnt = this.markers.length; i < cnt; i++) {
      this.markers[i].destroy();
    }
    this.markers.length = 0;
    return this;
  }

  /**
   * This function verifies if the moving the piece from preTile to curTile
   * does not break any of the game rules.
   */ 
  canSlide(piece, curTile, preTile, pathFinder) {
    const board = pathFinder.board;
  
    const preNeighbors = board
      .tileXYArrayToChessArray(board.getNeighborTileXY(preTile, null))
      .filter(neighbor => neighbor !== piece);
    const curNeighbors = board
      .tileXYArrayToChessArray(board.getNeighborTileXY(curTile, null))
      .filter(neighbor => neighbor !== piece);
  
    // Piece is currently in overlaping position, any movement is allowed
    if (piece.canOverlap && piece.rexChess.tileXYZ.z !== 'pathfinderLayer') {
      return true;
    }
  
    // Allow movement when destination tile is occupied, and piece can overlap
    if (piece.canOverlap && board.tileXYToChessArray(curTile.x, curTile.y).length > 0) {
      return this.isBoardContinuous(piece, { x: curTile.x, y: curTile.y });
    }
  
    // Verify if piece can physically slide to next tile
    const moveDirection = board.directionBetween(preTile, curTile);
    const adjacentDirections = [((moveDirection - 1) % 6 + 6) % 6, (moveDirection + 1) % 6];
    const preTileXYZ = { x: preTile.x, y: preTile.y, z: 'pathfinderLayer' };
    const neighborAtDir0 = board.getNeighborChess(preTileXYZ, adjacentDirections[0]);
    const neighborAtDir1 = board.getNeighborChess(preTileXYZ, adjacentDirections[1]);
    if (neighborAtDir0 && neighborAtDir0 !== piece && neighborAtDir1 && neighborAtDir1 !== piece)
      return false;
    
    /**
     * Verify if piece breaks the one hive rule while sliding to next tile.
     * It does not check if the resulting move create two disconnect hives.
     */ 
    for (const preNeighbor of preNeighbors) {
      const commonNeighbor = curNeighbors.find(curNeighbor => curNeighbor === preNeighbor);
      if (commonNeighbor) {
        return this.isBoardContinuous(piece, { x: curTile.x, y: curTile.y });
      }
    }

    return false;
  }

  /**
   * This function verifies if moving 'this' piece to location tileXY does not
   * break the continuity of the board. All piece must be connected as a single
   * graph component.
   */
  isBoardContinuous(piece, tileXY) {
    let graph = this.createGraph(piece, piece.rexChess.board, tileXY);
    if (graphlib.alg.components(graph).length > 1) return false;

    graph = this.addPieceToGraph(piece, graph, piece.rexChess.board, tileXY);
    return graphlib.alg.components(graph).length == 1;
  }

  /**
   * This function create a graph, and places 'this' piece at the location
   * in the arguments.
   */ 
  createGraph(sourcePiece, board, location) {
    const graph = new Graph({ directed: false });
    const pieces = board
      .getAllChess()
      .filter((chess) => chess instanceof BoardPiece && chess.rexChess.tileXYZ.z === 'pathfinderLayer' && chess !== sourcePiece);

    // Add nodes
    pieces.forEach((piece) => {
      graph.setNode(piece.rexChess.$uid);
    });

    // Add vertices - omit edges to the piece being moved
    pieces.forEach((piece) => {
      const neighbors = board.getNeighborChess(piece, null);
      neighbors.forEach((neighbor) => {
        if (neighbor != sourcePiece && !graph.hasEdge(piece.rexChess.$uid, neighbor.rexChess.$uid))
          graph.setEdge(piece.rexChess.$uid, neighbor.rexChess.$uid);
      });
    });

    // Add Nodes and vertices to tiles occupying the same tile location
    const sameTilePieces = board
      .tileXYToChessArray(sourcePiece.rexChess.tileXYZ.x, sourcePiece.rexChess.tileXYZ.y)
      .filter(piece => piece != sourcePiece && piece.rexChess.tileXYZ.z !== 'pathfinderLayer');
    if (sameTilePieces.length > 0) {
      sameTilePieces.forEach((piece) => {
        graph.setNode(piece.rexChess.$uid);
      });

      sameTilePieces.forEach((piece) => {
        const neighbors = board.getNeighborChess(sourcePiece, null);
        neighbors.forEach((neighbor) => {
          if (neighbor != sourcePiece && !graph.hasEdge(piece.rexChess.$uid, neighbor.rexChess.$uid))
            graph.setEdge(piece.rexChess.$uid, neighbor.rexChess.$uid);
        });
      });
    }
    return graph;
  }

  addPieceToGraph(sourcePiece, graph, board, location) {
    graph.setNode(sourcePiece.rexChess.$uid);
    // Add vertices to piece being moved at new location
    const neighborPieces = board.tileXYArrayToChessArray(board.getNeighborTileXY(location, null));
    neighborPieces.forEach((neighbor) => {
      if (neighbor != sourcePiece) {
        if (!graph.hasEdge(sourcePiece.rexChess.$uid, neighbor.rexChess.$uid))
          graph.setEdge(sourcePiece.rexChess.$uid, neighbor.rexChess.$uid);
      }
    });
    return graph;
  }

  moveToTile(destinationTile) {
    if (this.moveTo.isRunning) return false;
    this.reorderDestinationTile(destinationTile);
    this.previousTileXYZ = this.rexChess.tileXYZ;
    const tileXYArray = this.pathFinder.getPath(destinationTile);
    this.moveAlongPath(tileXYArray);
    return true;
  }

  moveAlongPath(path) {
    if (path.length === 0) {
      this.showMoveableArea();
      const scene = this.rexChess.board.scene;
      scene.setState(Constants.GameState.READY);
      return;
    }

    const nextTile = path[0];
    this.moveTo.once('complete', function () {
      this.moveAlongPath(path.slice(1));
    }, this);
    
    this.moveTo.moveTo(nextTile);
    return this;
  }

  /**
   * This function handles the layering of pieces, when pieces occupy the same tile.
   * This is due to the limitation of the board library that does no permit multiple
   * pieces to occupy the same tile at the same layerZ.
   */ 
  reorderTiles(gameObject) {
    const board = gameObject.rexChess.board;

    // On previous tile, send piece back to base layer
    const previousTileXYZ = gameObject.previousTileXYZ;
    const previousTilePieces = board
      .tileXYToChessArray(previousTileXYZ.x, previousTileXYZ.y)
      .filter((piece) => piece instanceof BoardPiece);
    const pieceAtBaseLayer = previousTilePieces.find(piece => piece.rexChess.tileXYZ.z === 'pathfinderLayer');
    if (previousTilePieces.length > 0 && !pieceAtBaseLayer){
      previousTilePieces[0].rexChess.setTileZ('pathfinderLayer');
    }

    // On destination tile, send piece back to base layer if it was not occupied
    const destinationTile = gameObject.rexChess.tileXYZ;
    const destinationTilePieces = board
      .tileXYToChessArray(destinationTile.x, destinationTile.y)
      .filter((piece) => piece instanceof BoardPiece);
    if (!board.contains(destinationTile.x, destinationTile.y, 'pathfinderLayer'))
      gameObject.rexChess.setTileZ('pathfinderLayer');

    // Reposition pieces within the tile
    this.reposition(previousTilePieces);
    this.reposition(destinationTilePieces);
  }

  reorderDestinationTile(destinationTile) {
    if (this.rexChess.board.contains(destinationTile.x, destinationTile.y, 'pathfinderLayer'))
      this.rexChess.setTileZ(`pathfinderLayer-${this.rexChess.$uid}`);
  }

  /**
   * This function changes the location of the piece within the tile
   * Since multiple pieces can occupy a tile, this function organize the pieces
   * such that the piece at the top of the stack will be more prominent.
   */ 
  reposition(piecesInTile) {
    piecesInTile.forEach(piece => piece.setDepth(5));

    if (piecesInTile.length == 1) {
      piecesInTile[0].setOrigin(0.5);
      piecesInTile[0].setScale(0.45);
    } else if (piecesInTile.length == 2) {
      piecesInTile[0].setOrigin(0.5, 0.35);
      piecesInTile[0].setScale(0.35);
      this.topOfStackPositioning(piecesInTile, 1);
    } else if (piecesInTile.length == 3) {
      piecesInTile.forEach(piece => piece.setScale(0.35));
      piecesInTile[0].setOrigin(0.2, 0.35);
      piecesInTile[1].setOrigin(0.8, 0.35);
      this.topOfStackPositioning(piecesInTile, 2);
    } else if (piecesInTile.length == 4) {
      piecesInTile.forEach(piece => piece.setScale(0.3));
      piecesInTile[0].setOrigin(0.1, 0.35);
      piecesInTile[1].setOrigin(0.5, 0.35);
      piecesInTile[2].setOrigin(0.9, 0.35);
      this.topOfStackPositioning(piecesInTile, 3);
    } else if (piecesInTile.length == 5) {
      piecesInTile.forEach(piece => piece.setScale(0.3));
      piecesInTile[0].setOrigin(0, 0.35);
      piecesInTile[1].setOrigin(0.33, 0.35);
      piecesInTile[2].setOrigin(0.66, 0.35);
      piecesInTile[3].setOrigin(1, 0.35);
      this.topOfStackPositioning(piecesInTile, 4);
    }
  }

  topOfStackPositioning(piecesInTile, index) {
    piecesInTile[index].setOrigin(0.5, 0.95);
    piecesInTile[index].setDepth(4);
    piecesInTile[index].setScale(0.45);
  }
}
