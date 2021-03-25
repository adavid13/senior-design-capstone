from .ArtificialAgent import ArtificialAgent
from .GameBoard import GameBoard
from .GameModel import GameModel
import re

class Engine:
    def __init__(self):
        self.INFO_STRING = "id ENGG 4000 Chexy Development Version"
        self.artificialAgent = ArtificialAgent()
        #self.gameBoard = GameBoard() # GameModel contains a board object
        self.gameModel = GameModel()

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
        
        returnStr += "\nok"
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
        self.gameModel = GameModel()
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
            return "err " + str(e)
    
    def validmoves(self) -> str:
        return self.gameModel.validMoves()



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
        print('gs=',gameString)
        gameModel = GameModel(moves_in=[], board=GameBoard(pieces=[]))
        print('gm moves=',gameModel.moves)
        gameStringSplit = gameString.split(";")
        if gameStringSplit[0] != "Base":
            raise NotImplementedError("Non-Base games not supported")
        turnColour = gameStringSplit[0:5]
        # for i in range(3, len(gameStringSplit)):
        #     #gameModel.board.playMove(gameStringSplit[i])
        #     print('parsing=',gameStringSplit[i])
        #     moveStringSplit = gameStringSplit[i].split(" ")
        #     for move in range(0, len(moveStringSplit))[::-1]:
        #         print('playing', gameStringSplit[move])
        #         gameModel.playMove(gameStringSplit[move])
        
        moves = gameStringSplit[3]
        print('parsing=',moves)
        moveStringSplit = moves.split(" ")
        firstMove = moveStringSplit[-1]
        m = re.search('[w|b].+', firstMove)
        if m:
            found = m.group(0)
            print(found)
            gameModel.playMove(found)
        else:
            print('bad first move=',firstMove)
        for move in range(0,len(moveStringSplit) - 1)[::-1]:
            moveStringSplit[move+1]
            m = re.search('[w|b].+', moveStringSplit[move])
            if m:
                nxt = m.group(0)
                print(nxt)
                gameModel.playMove(nxt)
            else:
                print('bad move=',firstMove)


        self.gameModel = gameModel

if __name__ == "__main__":
    games = 1
    wins = []
    turns=[]
    for i in range(games):
        ge = Engine()
        ge.newGame()
        print("Playing game {} of {}...".format(i+1, games))
        while(True):
            try:
                ge.parse("play {}".format(ge.bestmove(difficulty=1)))
                ge.parse("play {}".format(ge.bestmove(difficulty=0)))
                result = ge.gameModel.board.isGameOver()
                ge.gameModel.board.printBoard()
                if result or ge.gameModel.turnNum>=100:
                    break
            except Exception as e:
                raise(e)
                print("ERROR")
                result = False
                break
        ge.gameModel.board.printBoard()
        print("WINNER! {}".format(result))
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

        