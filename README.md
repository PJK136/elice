![elice_logo](/src/img/text_logo.png?raw=true)

## The team

This project was born in INSA Lyon after a school request. The developper team :
* CHALLAL Mohamed
* DU Paul
* FAURE--GIOVAGNOLI Pierre
* LE CONTE Alexis

## REACT

This project was bootstrapped with [Create React App].
* `npm install` to install packages
* `npm start` for development
* `npm run build` for production

## CSV input format

1st line is the column header.
Each following line after represent 1 student.
There must be as many columns of wishes as modules.
Appeals are optional but if used, every module/course must have a column of appeal.

Example :

```
Nom,Prénom,Adresse e-mail,Voeu 1, Voeu 2,Voeu 3,Voeu 4,Attrait Mod1,Attrait Mod2, Attrait Mod3,Attrait Mod4
Lereau,Georges,GeorgesLereau@jourrapide.com,Mod2,Mod3,Mod1,Mod4,peu intéressant,très intéressant,intéressant,peu intéressant
Sorel,Jacqueline,JacquelineSorel@rhyta.com,Mod1,Mod4,Mod3,Mod2,très intéressant,intéressant,pas du tout intéressant,très intéressant
```

## [Try It!](https://pjk136.github.io/elice/)

