import {buildTheme} from '@sanity/themer'

export const theme = buildTheme({
  light: {accent: '#585a50', text: '#34352f', background: '#f3f0e8', contrast: 95},
  dark: {accent: '#c7cab7', text: '#dbddd2', background: '#171715', contrast: 95},
})
