// Keyword → theme slug, matched against free text (plaque inscriptions, event
// blurbs). Loose by design: imported records get corrected in review.
export const THEME_RULES = [
  ['music', /music|singer|vocalist|jazz|reggae|afrobeat|composer|pianist|piano|drummer|saxophon|clarinet|violin|band|album|concert|recording|broadcast/i],
  ['sport', /football|cricket|boxing|heavyweight|athlet|olympic|gold medal/i],
  ['literature', /writer|author|poet|novelist|playwright|publish|journalist/i],
  ['performance', /actor|actress|theatre|perform/i],
  ['visual-art', /artist|sculpt|designer|textile/i],
  ['medicine', /doctor|physician|nurse|medic/i],
  ['education', /educat|teacher|scholar|student/i],
  ['civic-life', /mayor|council|politic|parliament|barrister|campaign|activist|civil rights|human rights|community/i],
  ['panafricanism', /pan-?african/i],
  ['abolition', /abolition|slave/i],
  ['labour-movement', /trade union/i],
  ['trade', /entrepreneur|industrialist|business|haircare|beauty industry|shop/i],
  ['windrush', /windrush/i],
  ['caribbean-diaspora', /caribbean|jamaica|trinidad|barbad|antigua|guyan|grenad|west indi|carnival/i],
  ['african-diaspora', /africa|nigeria|ghana|sierra leone/i]
];

export const guessThemes = text => THEME_RULES.filter(([, re]) => re.test(text)).map(([t]) => t);
