import Phaser from 'phaser';
import { Constants } from '../../utils/constants';
import { createPieceId, getPieceTexture } from '../../utils/piecesUtils';

export default class Card extends Phaser.GameObjects.Container {
  background;
  pieceTexture;

  constructor(scene, interfaceModel, player, x, y, id, type, rotated, onPieceSelected) {
    super(scene, x, y);
    this.scene = scene;
    this.id = createPieceId(player, type, id);
    this.interfaceModel = interfaceModel;
    this.rotated = rotated;
    this.originalX = x;
    this.originalY = y;
    this.player = player;
    this.type = type;
    this.pieceTexture = getPieceTexture(type, player.getFaction());
    this._isOnBoard = false;
    this.createSounds();
    this.onPieceSelected = (piece) => {
      onPieceSelected(piece);
    };

    this.background = this.scene.add
      .sprite(0, 0, 'card', 0)
      .setOrigin(0.5, 1)
      .setScale(0.2);
    this.backgroundPipeline = this.scene.plugins.get('rexGrayScalePipeline').add(this.background);
    this.backgroundPipeline.intensity = 0;

    this.pieceTexture = this.scene.add
      .image(0, -54, this.pieceTexture)
      .setOrigin(0.5)
      .setScale(0.275);
    this.texturePipeline = this.scene.plugins.get('rexGrayScalePipeline').add(this.pieceTexture);
    this.texturePipeline.intensity = 0;

    if (rotated) {
      this.background.setRotation(Math.PI);
      this.pieceTexture.setOrigin(0.5).setY(53);
    }

    this.add(this.background);
    this.add(this.pieceTexture);
    scene.add.existing(this);

    this.background.setInteractive()
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, this.handleUp, this)
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.handleOut, this)
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.handleOver, this);
  }

  getPlayer() {
    return this.player;
  }

  getType() {
    return this.type;
  }

  getId() {
    return this.id;
  }

  getFaction() {
    return this.player.getFaction();
  }

  get isOnBoard() {
    return this._isOnBoard;
  }

  set isOnBoard(isOnBoard) {
    this._isOnBoard = isOnBoard;
  }

  createSounds() {
    this.hoverSound = this.scene.sound.add('button-hover');
    this.clickSound = this.scene.sound.add('button-click');
  }

  setSelected(isSelected) {
    this.selected = isSelected;
    if (isSelected) {
      this.background.setTint(Constants.Color.YELLOW_HIGHLIGHT);
      this.pieceTexture.setTint(Constants.Color.YELLOW_HIGHLIGHT);
      if (this.rotated) {
        this.setY(this.y + 10);
      } else {
        this.setY(this.y - 10);
      }
    } else {
      this.background.setTint(Constants.Color.WHITE);
      this.pieceTexture.setTint(Constants.Color.WHITE);
      this.setY(this.originalY);
    }
    return this;
  }

  setDisabled() {
    this.background.disableInteractive();
    this.scene.tweens.add({
      targets: this.backgroundPipeline,
      intensity: 1,
      yoyo: false,
      repeat: 0
    });
    this.scene.tweens.add({
      targets: this.texturePipeline,
      intensity: 1,
      yoyo: false,
      repeat: 0
    });
    return this;
  }

  setEnabled() {
    this.background.setInteractive();
    this.scene.tweens.add({
      targets: this.backgroundPipeline,
      intensity: 0,
      yoyo: false,
      repeat: 0
    });
    this.scene.tweens.add({
      targets: this.texturePipeline,
      intensity: 0,
      yoyo: false,
      repeat: 0
    });
    return this;
  }

  handleOver(pointer) {
    if (!this.selected) {
      if (this.rotated) {
        this.setY(this.y + 10);
      } else {
        this.setY(this.y - 10);
      }
      if (this.hoverSound && this.interfaceModel) {
        this.hoverSound.setVolume(this.interfaceModel.soundLevel);
        this.hoverSound.play();
      }
    }
  }

  handleOut(pointer) {
    if (!this.selected) {
      this.setY(this.originalY);
    }
  }

  handleUp(pointer) {
    if (this.selected) {
      this.onPieceSelected(null);
    } else {
      this.onPieceSelected(this);
    }
    if (this.clickSound && this.interfaceModel) {
      this.clickSound.setVolume(this.interfaceModel.soundLevel);
      this.clickSound.play();
    }
  }
}