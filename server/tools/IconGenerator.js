import { createAvatar } from '@dicebear/core';
import { botttsNeutral,bottts,adventurer,bigEars, bigSmile, lorelei, loreleiNeutral, notionists, notionistsNeutral, openPeeps, pixelArt, thumbs } from '@dicebear/collection';
import {randomBytes} from 'crypto'

export class Icons {
  static styles={
    botttsNeutral,
    bottts,
    adventurer,
    bigEars,
    bigSmile,
    lorelei,
    loreleiNeutral,
    notionists,
    notionistsNeutral,
    openPeeps,
    pixelArt,
    thumbs
  }
  static baseStyles=[
    "openPeeps",
    "notionistsNeutral",
    "pixelArt",
    "thumbs",
    "botttsNeutral"
  ]
  static genIcons(styleName,seed,options){
    const style=this.styles[styleName] ?? thumbs
    const avatar32 = createAvatar(style,{
      size:32,
      seed:seed,
      ...options
    }).toString()
    const avatar64 = createAvatar(style,{
      size:64,
      seed:seed,
      ...options
    }).toString()
    const avatar128 = createAvatar(style,{
      size:128,
      seed:seed,
      ...options
    }).toString()
    return {32:avatar32,64:avatar64,128:avatar128}
  }
  static getGuestIcon(){
    const avatars = this.genIcons(thumbs,this.seed(),{
      radius:10
    })
    return avatars
  }
  static genRandomIcon(){
    const seed=this.seed()
    const style= this.baseStyles[Math.floor(Math.random()*5)]
    return {seed,style}
  }
  static genSeeds(length){
    const seeds=[]
    for (let index = 0; index < length; index++) {
      seeds.push(randomBytes(16).toString('hex'))
    }
    return seeds
  }
  static seed(){
    return randomBytes(16).toString('hex')
  }
}


