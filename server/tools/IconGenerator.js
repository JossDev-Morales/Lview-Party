import { createAvatar } from '@dicebear/core';
import { botttsNeutral, bottts, adventurer, bigEars, bigSmile, lorelei, loreleiNeutral, notionists, notionistsNeutral, openPeeps, pixelArt, thumbs } from '@dicebear/collection';
import { randomBytes } from 'crypto'

export class Icons {
  static styles = {
    botttsNeutral,// 0
    bottts,// b
    adventurer,// p
    bigEars,// b
    bigSmile,// p
    lorelei,// p
    loreleiNeutral,//s
    notionists,// s
    notionistsNeutral,// 0
    openPeeps,// 0
    pixelArt,// 0
    thumbs// 0
  }
  static baseStyles = [
    "openPeeps",
    "botttsNeutral",
    "pixelArt",
    "notionistsNeutral",
    "thumbs"
  ]
  static genIcons(styleName, seed, options) {
    const style = this.styles[styleName] ?? thumbs
    const avatar32 = createAvatar(style, {
      size: 32,
      seed: seed,
      ...options
    }).toString()
    const avatar64 = createAvatar(style, {
      size: 64,
      seed: seed,
      ...options
    }).toString()
    const avatar128 = createAvatar(style, {
      size: 128,
      seed: seed,
      ...options
    }).toString()
    return { 32: avatar32, 64: avatar64, 128: avatar128 }
  }
  static getGuestIcon() {
    const avatars = this.genIcons(thumbs, this.seed(), {
      radius: 10
    })
    return avatars
  }
  static genRandomIcon() {
    const seed = this.seed()
    const style = this.baseStyles[Math.floor(Math.random() * 5)]//TODO: revisar la aleatoriedad, esta debe ser equilibrada entre las 5 opciones
    return { seed, style }
  }
  static genSeeds(length) {
    const seeds = []
    for (let index = 0; index < length; index++) {
      seeds.push(randomBytes(16).toString('hex'))
    }
    return seeds
  }
  static genRawList({ isPremium, subsType }) {
    let rawList = []
    let categories;
    let basic = [...this.baseStyles, "bottts", "bigEars"]
    let standard = [...basic, "loreleiNeutral", "notionists"]
    let pro = [...standard, "adventurer", "bigSmile", "lorelei"]

    if (!isPremium) {
      categories = this.baseStyles
    } else {
      if (subsType == "basic") {
        categories = basic
      } else if (subsType == "standard") {
        categories = standard
      } else if (subsType == "pro") {
        categories = pro
      }
    }
    rawList = categories.map((style) => {
      let icons = this.genSeeds(15)
      return {
        name: style,
        icons: icons.map(seed => {
          return {
            seed,
            icon:createAvatar(this.styles[style], {
              size: 90,
              seed: seed
            }).toString()
          }
        })
      }
    })
    return rawList
  }
  static seed() {
    return randomBytes(16).toString('hex')
  }
}




