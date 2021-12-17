const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { tokens } = require("../utils/utils");

const ETHER = tokens(1);
const TENETHER = tokens(10);
const FIVEHUNDREDETHER = tokens(500);
const ZERO = tokens(0);

let provider = ethers.provider;
let EmiDrops, deployer, owner, dropAdmin, Alice, Bob, Clarc, UsersList;

describe("Main test", function () {
  before(async () => {
    UsersList = await ethers.getSigners();
    [deployer, owner, dropAdmin, Alice, Bob, Clarc, Dillan] = UsersList;//await ethers.getSigners();
  });
  this.beforeEach(async () => {
    EMIDROPS = await ethers.getContractFactory("EmiDrops");
    EmiDrops = await upgrades.deployProxy(EMIDROPS, [owner.address, dropAdmin.address]);

    await EmiDrops.deployed();
  });

  it("deposite", async function () {
    await EmiDrops.connect(owner).deposit({ value: ETHER });
    expect(await EmiDrops.dropFund()).to.be.equal(ETHER);
  });

  it("deposite by sending ETH", async function () {
    await owner.sendTransaction({ to: EmiDrops.address, value: BigNumber.from(ETHER) });
    expect(await EmiDrops.dropFund()).to.be.equal(ETHER);
  });

  it("deposite not owner, must reverted", async function () {
    await expect(EmiDrops.connect(Alice).deposit({ value: ETHER })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("deposite by sending ETH from not owner Alice, must reverted", async function () {
    await expect(Alice.sendTransaction({ to: EmiDrops.address, value: BigNumber.from(ETHER) })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
  it("withdraw", async function () {
    await EmiDrops.connect(owner).deposit({ value: ETHER });

    let balanceBefore = await provider.getBalance(owner.address);
    let receiptWithdraw = await (await EmiDrops.connect(owner).withdraw(ETHER)).wait();
    let withdrawCost = (await receiptWithdraw.gasUsed).mul(receiptWithdraw.effectiveGasPrice);
    let balanceAfter = await provider.getBalance(owner.address);
    expect(balanceBefore.sub(withdrawCost).add(BigNumber.from(ETHER))).to.be.equal(balanceAfter);
    expect(await EmiDrops.dropFund()).to.be.equal(ZERO);
  });
  it("drop by not operator, must reverted", async function () {
    await expect(EmiDrops.connect(Alice).drop([], [], 0)).to.be.revertedWith("only actual operator allowed");
  });
  it("drop by operator", async function () {
    await EmiDrops.connect(owner).deposit({ value: TENETHER });
    let adressList = [Bob.address, Clarc.address, Dillan.address];
    let amountList = [tokens(5), tokens(3), tokens(2)];
    let dropAmount = tokens(10);

    let balancesBefore = [];
    for (const i of Array(3).keys()) {
      balancesBefore.push(await provider.getBalance(adressList[i]));
    }

    await EmiDrops.connect(dropAdmin).drop(adressList, amountList, dropAmount);

    for (const i of Array(3).keys()) {
      expect(balancesBefore[i].add(BigNumber.from(amountList[i]))).to.be.equal(
        await provider.getBalance(adressList[i])
      );
    }
  });
  it("drop to 500 wallets by operator", async function () {
    await EmiDrops.connect(owner).deposit({ value: FIVEHUNDREDETHER });

    let adressList = [], amountList = []
    for (const i of Array(500).keys()) {
      adressList.push(UsersList[10+i].address); // shift for not used wallets
      amountList.push(tokens(1));
    }
    let dropAmount = FIVEHUNDREDETHER;

    let balancesBefore = [];
    for (const i of Array(500).keys()) {
      balancesBefore.push(await provider.getBalance(adressList[i]));
    }

    //console.log(adressList, amountList, dropAmount);
    let tx = await EmiDrops.connect(dropAdmin).drop(adressList, amountList, dropAmount);

    let receiptDrop = await tx.wait();
    let dropCost = (await receiptDrop.gasUsed).mul(receiptDrop.effectiveGasPrice);

    //console.log("gasUsed", (await receiptDrop.gasUsed).toString()); // gasUsed 5389122

    for (const i of Array(500).keys()) {
      expect(balancesBefore[i].add(BigNumber.from(amountList[i]))).to.be.equal(
        await provider.getBalance(adressList[i])
      );
    }
  });
});
