pragma solidity ^0.8.0;

import "./MilkToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";

contract BurnMilkToken is Initializable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    MilkToken token;
    mapping(address => uint256) migratedBalances;
    address public constant BURN_ADDRESS = address(0xdead);

    function initialize(address _token) initializer public {
        token = MilkToken(_token);
    }

    //constructor (address _token) {
    //    token = MilkToken(_token);
    //}

    function burn(uint256 _amount) external {
        migratedBalances[msg.sender] += _amount;
        //uint256 currentAllowance = token.allowance(msg.sender, msg.sender);
        //console.log("allowance ${} amount", currentAllowance, _amount);
        token.transferFrom(msg.sender, BURN_ADDRESS, _amount);
    }
}