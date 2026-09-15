import { Platform } from 'react-native';

export * from './colors';
export const spacing  = { xs:4,sm:8,md:12,base:16,lg:20,xl:24,'2xl':32,'3xl':40,'4xl':48,'5xl':64 };
export const radius   = { sm:4,md:8,lg:12,xl:16,'2xl':24,full:9999 };
export const typography = {
  size: { xs:11,sm:12,base:14,md:15,lg:16,xl:18,'2xl':20,'3xl':24,'4xl':30 },
  weight: { regular:'400',medium:'500',semibold:'600',bold:'700' },
};
export const shadows  = {
  sm: Platform.select({
    web: { boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
    default: { shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:2,elevation:1 },
  }),
  md: Platform.select({
    web: { boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
    default: { shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:3 },
  }),
  lg: Platform.select({
    web: { boxShadow:'0 4px 16px rgba(0,0,0,0.12)' },
    default: { shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.12,shadowRadius:16,elevation:6 },
  }),
};
