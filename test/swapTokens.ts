import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Swap tokens", function () {

  const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const INITIAL_HWTOKEN_SUPPLY = 10000000;
  const USDT_LIQUIDITY_SUPPLY = 10000;
  const HWTOKEN_LIQUIDITY_SUPPLY = 10000;
  const HWTOKEN_EXCHANGED = 2000;
  const UNISWAP_V2_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  function inADay() {
    return Math.floor(new Date().getTime() / 1000) + 86400;
  }

  async function deployTokenAndCreatePairFixture() {
    const [hwTokenOwner, ethSender, liquidityProvider] = await ethers.getSigners();

    const hwTokenFactory = await ethers.getContractFactory("HWToken");

    const hwToken = await hwTokenFactory.connect(hwTokenOwner).deploy(INITIAL_HWTOKEN_SUPPLY);
    const usdt = await ethers.getContractAt("TetherToken", USDT_ADDRESS);
    const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER_ADDRESS);
    const factory = await ethers.getContractAt("IUniswapV2Factory", await router.factory());

    const usdtOwnerAddress = await usdt.getOwner();
    await ethSender.sendTransaction({
      to: usdtOwnerAddress,
      value: ethers.utils.parseEther("10")
    });
    const usdtOwner = await ethers.getImpersonatedSigner(await usdt.getOwner());
    await usdt.connect(usdtOwner).issue(USDT_LIQUIDITY_SUPPLY);
    await usdt.connect(usdtOwner).transfer(liquidityProvider.address, USDT_LIQUIDITY_SUPPLY);

    await hwToken.connect(hwTokenOwner).transfer(liquidityProvider.address, HWTOKEN_LIQUIDITY_SUPPLY);

    await hwToken.connect(liquidityProvider).approve(router.address, HWTOKEN_LIQUIDITY_SUPPLY);
    await usdt.connect(liquidityProvider).approve(router.address, USDT_LIQUIDITY_SUPPLY);

    await factory.createPair(hwToken.address, usdt.address);

    await router.connect(liquidityProvider).addLiquidity(
      hwToken.address,
      usdt.address,
      HWTOKEN_LIQUIDITY_SUPPLY,
      USDT_LIQUIDITY_SUPPLY,
      0,
      0,
      liquidityProvider.address,
      inADay()
    );

    return { hwTokenOwner, hwToken, usdt, router, factory };
  }

  it(`Pair should exist and have a reserve of ${HWTOKEN_LIQUIDITY_SUPPLY} HWTokens and ${USDT_LIQUIDITY_SUPPLY} USDT`, async function () {
    const { hwToken, usdt, factory } = await loadFixture(deployTokenAndCreatePairFixture);
    const pairAddress = await factory.getPair(hwToken.address, usdt.address);
    const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    const { reserve0, reserve1 } = await pair.getReserves();
    expect(reserve0).to.equal(HWTOKEN_LIQUIDITY_SUPPLY);
    expect(reserve1).to.equal(USDT_LIQUIDITY_SUPPLY);
  });

  it("Swapper should have 0 USDT before swap", async function () {
    const { hwTokenOwner, usdt } = await loadFixture(deployTokenAndCreatePairFixture);

    expect(await usdt.balanceOf(hwTokenOwner.address)).to.equal(0);
  })

  it(`Should be able to swap ${HWTOKEN_EXCHANGED} HWToken for USDT`, async function () {
    const { hwTokenOwner, hwToken, usdt, router } = await loadFixture(deployTokenAndCreatePairFixture);

    await hwToken.connect(hwTokenOwner).approve(router.address, HWTOKEN_EXCHANGED);
    await router.swapExactTokensForTokens(
      HWTOKEN_EXCHANGED,
      1,
      [hwToken.address, usdt.address],
      hwTokenOwner.address,
      inADay()
    );

    const usdtBalance = await usdt.balanceOf(hwTokenOwner.address);
    console.log(`Swapper USDT balance: ${usdtBalance} USDT`);
    expect(usdtBalance).to.be.greaterThan(0);
  })
});
