# Uniswap interaction

## How to run
```shell
npm install
export ALCHEMY_KEY=<YOUR KEY>
npx hardhat test
```

## Test output example
```shell
$ npx hardhat test
  Swap tokens
    ✔ Pair should exist and have a reserve of 10000 HWTokens and 10000 USDT (8727ms)
    ✔ Swapper should have 0 USDT before swap
Swapper USDT balance: 1662 USDT
    ✔ Should be able to swap 2000 HWToken for USDT (200ms)


  3 passing (9s)
```