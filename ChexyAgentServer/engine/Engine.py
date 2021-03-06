from .ArtificialAgent import ArtificialAgent
from .GameBoard import GameBoard
from .GameModel import GameModel
import re

class Engine:
    def __init__(self):
        self.INFO_STRING = "id ENGG 4000 Chexy Development Version"
        self.artificialAgent = ArtificialAgent()
        #self.gameBoard = GameBoard() # GameModel contains a board object
        self.gameModel = GameModel(board=None)

    def parse(self, string):
        '''
        Calls functions based on command strings

        > command [argument 1] [argument 2]
        '''
        returnStr = ""
        params = string.split()

        if "info" in params[0]:
            returnStr += self.info()
        elif "newgame" in params[0]:
            returnStr += self.newGame()
        elif "pass" in string:          # Pass has to check the entire string because it may be passed as a "play" parameter
            returnStr += self.passTurn()
        elif "play" in params[0]:
            if len(params) > 1:
                returnStr += self.play(' '.join(params[1:]))
            else:
                return "err Not enough arguments. A move must be specified."
        elif "validmoves" in params[0]:
            returnStr += self.validmoves()
        elif "bestmove" in params[0]:
            if len(params) == 2:
                returnStr += self.bestmove(params[1])
            elif len(params) == 3:
                returnStr += self.bestmove(params[1], params[2])
            else:
                return "err bestmove requires 1-2 parameters"
        elif "undo" in params[0]:
            if len(params) > 1:
                returnStr += self.undo(params[1])
            else:
                returnStr += self.undo()
        elif "options" in params[0]:
            returnStr += self.options()
        elif "help" in params[0]:
            return "Available commands: info, newgame, play, pass, validmoves, bestmove, undo, options, help"
        else:
            return "err Invalid command. Try 'help' to see a list of valid commands."
        
        #returnStr += "\nok"
        return returnStr

    def info(self):
        """
        Asks the engine to return its identification string.
        UHP compliant 

        > info
        """
        return self.INFO_STRING
    def newGame(self) -> str:
        """
        Asks the engine to start a new base game  
        UHP  compliant
        May not need parameters based on our requirements

        > newgame
        > Base;NotStarted;White[1]
        """
        self.gameModel = GameModel(board=None)
        return str(self.gameModel)

    def passTurn(self) -> str:
        """
        Asks the engine to play a pass move and return an updated GameString
        
        > pass
        < Base;InProgress;Black[1];wS1
        """
        return self.gameModel.playMove(passTurn=True)

    def play(self, moveString: str) -> str:
        """
        Asks the engine to play the specified MoveString
        Returns updated GameString

        > play wS1
        < Base;InProgress;Black[1];wS1
        """
        if moveString == "pass":
            self.passTurn()
            return
        if moveString not in self.gameModel.validMoves():
            raise Exception("not a valid move!")
        try:
            return self.gameModel.playMove(moveString)
        except Exception as e:
            self.gameModel.board.printBoard()
            print(self.gameModel.validMoves(), moveString)
            raise Exception("REEEEEE {}".format(moveString))
            return "err " + str(e)
    
    def validmoves(self) -> str:
        return self.gameModel.validMoves()


        piecesInPlay = []
        whiteTotalPieces = "wQ1;wS1;wS2;wB1;wB2;wA1;wA2;wA3;wG1;wG2;wG3".split(';')
        blackTotalPieces = "bQ1;bS1;bS2;bB1;bB2;bA1;bA2;bA3;bG1;bG2;bG3".split(';')
        if len(self.gameModel.board.pieces) == 0:
            if self.gameModel.turnColor == "White":
                return "wQ1;wS1;wS2;wB1;wB2;wA1;wA2;wA3;wG1;wG2;wG3"
            else:
                return "bQ1;bS1;bS2;bB1;bB2;bA1;bA2;bA3;bG1;bG2;bG3"
        blackQueeninPlay = "bQ1" in [p.id for p in self.gameModel.board.pieces]
        whiteQueeninPlay = "wQ1" in [p.id for p in self.gameModel.board.pieces]
        validMovesString = ""

        if not ((self.gameModel.turnNum == 4 and self.gameModel.turnColor == "Black" and not blackQueeninPlay) or ((self.gameModel.turnNum == 4 and self.gameModel.turnColor == "White" and not whiteQueeninPlay))):
            for piece in self.gameModel.board.pieces:
                piecesInPlay.append(piece.id)
                try:
                    if (piece.colour == 'b' and self.gameModel.turnColor == "Black" and blackQueeninPlay) or (piece.colour == 'w' and self.gameModel.turnColor == "White" and whiteQueeninPlay):
                        validMoves = piece.validMoves(self.gameModel)
                        for move in validMoves:
                            moveString = self._parseMoveString(move, piece)
                            validMovesString= validMovesString + (moveString+";")
                    else:
                        print(piece.colour, self.gameModel.turnColor)
                except Exception as e:
                    print(e)
                    pass
        neighbours = [[-2, 0], [-1, -1], [1, -1], [2, 0], [1, 1], [-1, 1]]
        symbols = ["{} {}-", "{} {}\\", "{} /{}", "{} -{}", "{} \\{}", "{} {}/"]
        whitePiecesNotInPlay = [p for p in whiteTotalPieces if p not in piecesInPlay]
        blackPiecesNotInPlay = [p for p in blackTotalPieces if p not in piecesInPlay]
        if not whiteQueeninPlay and ge.gameModel.turnNum == 4:
            whitePiecesNotInPlay = ["wQ1"]
        elif not blackQueeninPlay and ge.gameModel.turnNum == 4:
            blackPiecesNotInPlay = ["bQ1"]
        for i in range(4, self.gameModel.board.MAX_BOARD_SIZE-2):
            for j in range(4, self.gameModel.board.MAX_BOARD_SIZE-2):
                if ((i+j) % 2) == 0:
                    if self.gameModel.board.Board[i][j] is None:
                        whiteCount = []
                        blackCount = []
                        for k in range(len(neighbours)):
                            pieceAtLoc = self.gameModel.board.Board[i+neighbours[k][0]][j+neighbours[k][1]]
                            if pieceAtLoc is not None:
                                if pieceAtLoc.id[0] == 'w':
                                    whiteCount.append([pieceAtLoc, symbols[k]])
                                elif pieceAtLoc.id[0] == 'b':
                                    blackCount.append([pieceAtLoc, symbols[k]])
                        if self.gameModel.turnColor == 'White' and len(whiteCount)>0 and len(blackCount) == 0:
                            for p in whitePiecesNotInPlay:
                                for wp in whiteCount:
                                    validMovesString = validMovesString + wp[1].format(p, wp[0].id) + ";"
                        if self.gameModel.turnColor == 'Black' and len(blackCount)>0 and len(whiteCount) == 0:
                            for p in blackPiecesNotInPlay:
                                for wp in blackCount:
                                    validMovesString = validMovesString + wp[1].format(p, wp[0].id) + ";"
        return validMovesString


    def _parseMoveString(self, moveArr, gamePiece):
        """
        _parseMoveString([17, 19], "wB1") -> "wB1 -wS1;wB1 wA1;wB1 bQ1/"

        """
        if(self.gameModel.board.Board[moveArr[0]][moveArr[1]] is not None):
            return "{} {}".format(gamePiece.id, self.gameModel.board.Board[moveArr[0]][moveArr[1]].id)
        collection = ""
        neighbours = [[-2, 0], [-1, -1], [1, -1], [2, 0], [1, 1], [-1, 1]]
        symbols = ["{} {}-", "{} {}\\", "{} /{}", "{} -{}", "{} \\{}", "{} {}/"]
        for i in range(len(neighbours)):
            dx, dy = neighbours[i][0], neighbours[i][1]
            piece = self.gameModel.board.Board[moveArr[0]+dx][moveArr[1]+dy]
            if  piece is not None and piece != gamePiece:
                collection+=symbols[i].format(gamePiece.id, piece.id)
        return collection

    def bestmove(self, difficulty=1, maxTime=None, maxDepth=None) -> str:
        """
        Asks the engine for the AI's suggestion for the best move on the current board within certain limits

        > bestmove time 0.05
        > bestmove depth 2
        < wS1
        """
        if self.gameModel.turnNum == 1:
            difficulty = 0
        move = self.artificialAgent.bestMove(self.gameModel, difficulty, maxTime, maxDepth)
        return move

    def undo(self, numMoves = 1) -> str:
        """
        Asks the engine to undo one or more previous moves
        >undo 3
        <Base;NotStarted;White[1]
        """
        self.gameModel = GameModel.previousState
        pass
    def options(self):
        """
        Used to configure the engine, though no functionality required for UHP compliance.

        No options currently, return nothing
        """
        return ""
    def parseMoveString(self, moveString):
        pass
    def parseGameString(self, gameString):
        """
        Creates a gamestate from a gamestring

        """
        # print('gs=',gameString)
        #gameModel = GameModel(moves_in=[], board=GameBoard(pieces=[]))
        gameModel = GameModel(board=None)
        # print('gm moves=',gameModel.moves)
        gameStringSplit = gameString.split(";")
        if gameStringSplit[0] != "Base":
            raise NotImplementedError("Non-Base games not supported")
        turnColour = gameStringSplit[2][0:5]
        for i in range(3, len(gameStringSplit)):
            # print('parsing=',gameStringSplit[i])
            print(gameStringSplit[i])
            gameModel.playMove(gameStringSplit[i])

        self.gameModel = gameModel

if __name__ == "__main__":
    games = 30
    wins = []
    turns=[]
    for i in range(games):
        ge = Engine()
        ge.newGame()
        print("Playing game {} of {}...".format(i+1, games))
        while(True):
            try:
                ge.parse("play {}".format(ge.bestmove(difficulty=1)))
                ge.parse("play {}".format(ge.bestmove(difficulty=1)))
                result = ge.gameModel.board.isGameOver()
                #ge.gameModel.board.printBoard()
                if result or ge.gameModel.turnNum>=100:
                    break
            except Exception as e:
                raise(e)
                print("ERROR")
                result = False
                break
        ge.gameModel.board.printBoard()
        print("WINNER! {}".format(result))
        print(ge.gameModel.moves)
        if result == 'W':
            wins.append(1)
        else:
            wins.append(0)
        turns.append(ge.gameModel.turnNum)
        del ge.gameModel
        del ge
    print("wins: ", wins)
    print("turns:", turns)
    print("avg turns:", sum(turns)/len(turns))
    print("white won {}%".format(sum(wins)/games*100))

        
