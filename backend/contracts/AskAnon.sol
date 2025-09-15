// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title AskAnon — On-chain anonymous Q/A with FHEVM demo field
/// @notice Stores question/answer text on-chain and uses FHEVM for an encrypted 32-bit secret per question.
///         The secret is set by the asker at creation and may be decrypted client-side using the Relayer SDK,
///         following Zama's official flow (EIP-712 + userDecrypt).
contract AskAnon is SepoliaConfig {
    struct Question {
        address asker; // who asked (always stored, UI may hide when isAnonymous)
        bool isAnonymous; // UI hint
        address target; // who should answer

        // On-chain plain text for demo purposes. Encryption for the secret uses FHEVM.
        string questionText;
        string answerText;
        bool answered;

        // Bounty in Wei to reward the answerer (target). Locked at creation, released on answer.
        uint256 bountyWei;

        // Encrypted 32-bit secret tied to the question.
        euint32 secret;
    }

    event QuestionAsked(uint256 indexed id, address indexed asker, address indexed target, bool isAnonymous, uint256 bountyWei);
    event QuestionAnswered(uint256 indexed id, address indexed target, uint256 bountyWeiReleased);

    uint256 private _nextId = 1;
    mapping(uint256 => Question) private _questions;
    mapping(address => uint256[]) private _byTarget;
    mapping(address => uint256[]) private _byAsker;

    /// @notice Create a new question.
    /// @param secretInput Encrypted 32-bit secret chosen by the asker.
    /// @param inputProof The input proof for the encrypted value.
    /// @param target The address expected to answer the question.
    /// @param questionText Plain text of the question (stored on-chain for demo purposes).
    /// @param isAnonymous If true, frontends should hide the asker when rendering.
    /// @dev msg.value is locked as a bounty and transferred to the target when answering.
    function askQuestion(
        externalEuint32 secretInput,
        bytes calldata inputProof,
        address target,
        string calldata questionText,
        bool isAnonymous
    ) external payable returns (uint256 id) {
        require(target != address(0), "Invalid target");

        // Import encrypted input using FHEVM
        euint32 encSecret = FHE.fromExternal(secretInput, inputProof);

        id = _nextId++;

        Question storage q = _questions[id];
        q.asker = msg.sender;
        q.isAnonymous = isAnonymous;
        q.target = target;
        q.questionText = questionText;
        q.answered = false;
        q.bountyWei = msg.value;
        q.secret = encSecret;

        // Allow contract, asker and target to decrypt this question secret
        FHE.allowThis(q.secret);
        FHE.allow(q.secret, msg.sender);
        FHE.allow(q.secret, target);

        _byTarget[target].push(id);
        _byAsker[msg.sender].push(id);

        emit QuestionAsked(id, msg.sender, target, isAnonymous, msg.value);
    }

    /// @notice Answer an existing question. Releases the bounty to the target.
    /// @param id Question identifier.
    /// @param answerText Plain text of the answer (stored on-chain for demo purposes).
    function answerQuestion(
        uint256 id,
        string calldata answerText
    ) external {
        Question storage q = _questions[id];
        require(q.target != address(0), "Not found");
        require(msg.sender == q.target, "Only target");
        require(!q.answered, "Already answered");

        q.answerText = answerText;
        q.answered = true;

        uint256 bounty = q.bountyWei;
        if (bounty > 0) {
            q.bountyWei = 0;
            (bool ok, ) = q.target.call{value: bounty}("");
            require(ok, "Transfer failed");
        }

        // Keep the same secret; it can be used by both asker and target for verification.
        // If needed, one could implement a follow-up FHE update here using external encrypted input.

        emit QuestionAnswered(id, q.target, bounty);
    }

    /// @notice Read-only accessor for question metadata (without the encrypted secret).
    function getQuestion(uint256 id)
        external
        view
        returns (
            address asker,
            bool isAnonymous,
            address target,
            string memory questionText,
            string memory answerText,
            bool answered,
            uint256 bountyWei
        )
    {
        Question storage q = _questions[id];
        require(q.target != address(0), "Not found");
        return (
            q.asker,
            q.isAnonymous,
            q.target,
            q.questionText,
            q.answerText,
            q.answered,
            q.bountyWei
        );
    }

    /// @notice Returns the encrypted secret handle for a question.
    function getQuestionSecret(uint256 id) external view returns (euint32) {
        Question storage q = _questions[id];
        require(q.target != address(0), "Not found");
        return q.secret;
    }

    /// @notice Lists question ids by target.
    function listByTarget(address target) external view returns (uint256[] memory) {
        return _byTarget[target];
    }

    /// @notice Lists question ids by asker.
    function listByAsker(address asker) external view returns (uint256[] memory) {
        return _byAsker[asker];
    }
}


