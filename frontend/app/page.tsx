"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";

import { MetaMaskProvider, useMetaMask } from "../hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider, useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "../fhevm/useFhevm";
import { GenericStringInMemoryStorage } from "../fhevm/GenericStringStorage";
import { useAskAnon } from "../hooks/useAskAnon";

function AppInner() {
  const { provider, chainId, accounts, isConnected, connect, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner, initialMockChains } = useMetaMaskEthersSigner();

  const { instance, status, error } = useFhevm({
    provider: provider,
    chainId: chainId,
    enabled: true,
    initialMockChains,
  });

  const storage = useMemo(() => new GenericStringInMemoryStorage(), []);

  const askAnon = useAskAnon({
    instance,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    fhevmDecryptionSignatureStorage: storage,
    chainId,
    currentAccount: accounts && accounts.length > 0 ? accounts[0] : undefined,
  });

  const [activeTab, setActiveTab] = useState<"ask" | "search" | "manage">("ask");

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 text-glow">
            AskAnon
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Privacy-Preserving Anonymous Q&amp;A Platform
          </p>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            Powered by Fully Homomorphic Encryption (FHE) technology, enabling secure and truly anonymous questions and answers
          </p>
        </div>

        {/* Connection Status */}
        <div className="card max-w-2xl mx-auto mb-8">
        {isConnected ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
                  <div className="text-sm text-gray-400">Connected to Chain</div>
                  <div className="font-semibold text-primary-400">Chain ID: {chainId}</div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-sm text-gray-400">Wallet Address</div>
                <div className="font-mono text-sm text-gray-200">
                  {accounts && accounts.length > 0 ? truncateAddress(accounts[0]) : "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-4">Connect your wallet to start using AskAnon</p>
              <button onClick={connect} className="btn-primary">
                <svg className="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Connect MetaMask
              </button>
            </div>
          )}

          {/* FHEVM Status */}
          <div className="mt-4 pt-4 border-t border-dark-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">FHEVM Status:</span>
                <span className={`status-badge ${status === "ready" ? "bg-green-500/20 text-green-400" : status === "loading" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                  {status}
                </span>
              </div>
              {error && (
                <span className="text-xs text-red-400">{String(error)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {askAnon.message && (
          <div className="max-w-2xl mx-auto mb-6 animate-slide-up">
            <div className="glass-effect rounded-lg p-4 border-l-4 border-primary-500">
              <p className="text-sm text-gray-300">{askAnon.message}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveTab("ask")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "ask"
                  ? "bg-primary-600 text-white shadow-lg"
                  : "bg-dark-700 text-gray-400 hover:bg-dark-600"
              }`}
            >
              Create Question
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "search"
                  ? "bg-primary-600 text-white shadow-lg"
                  : "bg-dark-700 text-gray-400 hover:bg-dark-600"
              }`}
            >
              Search &amp; Answer
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "manage"
                  ? "bg-primary-600 text-white shadow-lg"
                  : "bg-dark-700 text-gray-400 hover:bg-dark-600"
              }`}
            >
              My Questions
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Create Question Tab */}
        {activeTab === "ask" && (
          <div className="card max-w-3xl mx-auto animate-fade-in">
            <h2 className="card-header">Create a New Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={askAnon.form.target}
                  onChange={(e) => askAnon.formSetters.setTarget(e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">The address of the person who will answer this question</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Question <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Enter your question here..."
                  value={askAnon.form.questionText}
                  onChange={(e) => askAnon.formSetters.setQuestionText(e.target.value)}
                  className="input-field min-h-[100px] resize-y"
                  rows={3}
                />
      </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secret Code <span className="text-red-400">*</span>
          </label>
                  <input
                    type="number"
                    placeholder="Enter a uint32 number"
                    value={askAnon.form.secret}
                    onChange={(e) => askAnon.formSetters.setSecret(e.target.value)}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">A secret number for the recipient to verify (uint32)</p>
        </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bounty (wei)
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={askAnon.form.bounty}
                    onChange={(e) => askAnon.formSetters.setBounty(e.target.value)}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional reward for answering</p>
                </div>
        </div>

              <div className="flex items-center gap-3 p-4 bg-dark-700 rounded-lg">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={askAnon.form.isAnonymous}
                  onChange={(e) => askAnon.formSetters.setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 text-primary-600 bg-dark-600 border-dark-500 rounded focus:ring-primary-500"
                />
                <label htmlFor="anonymous" className="text-sm font-medium text-gray-300 cursor-pointer">
                  Ask Anonymously
                  <span className="block text-xs text-gray-500 font-normal mt-1">
                    Your address will not be visible to the recipient
                  </span>
                </label>
              </div>

              <button
                disabled={!askAnon.canAsk}
                onClick={askAnon.ask}
                className="btn-primary w-full"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Question
              </button>
            </div>
          </div>
        )}

        {/* Search & Answer Tab */}
        {activeTab === "search" && (
          <div className="card max-w-3xl mx-auto animate-fade-in">
            <h2 className="card-header">Search Question by Secret</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter the secret code (uint32)"
                    value={askAnon.search.value}
                    onChange={(e) => askAnon.search.setValue(e.target.value)}
                    className="input-field flex-1"
                  />
                  <button onClick={askAnon.search.execute} className="btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Search for questions directed to you using the secret code</p>
              </div>

              {askAnon.search.result && (
                <div className="question-card mt-6 animate-slide-up">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="badge-info">Matched Question</span>
                    </div>
                    <span className={`badge ${askAnon.search.result.answered ? "badge-success" : "badge-warning"}`}>
                      {askAnon.search.result.answered ? "Answered" : "Pending"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-400">Question ID:</span>
                      <span className="ml-2 font-mono text-primary-400">{String(askAnon.search.result.id)}</span>
                    </div>

                    <div>
                      <span className="text-sm text-gray-400">Question:</span>
                      <p className="mt-1 text-gray-200 bg-dark-800 p-3 rounded">{askAnon.search.result.questionText}</p>
                    </div>

                    <div>
                      <span className="text-sm text-gray-400">Target:</span>
                      <span className="ml-2 font-mono text-sm text-gray-300">{truncateAddress(askAnon.search.result.target)}</span>
        </div>

                    {askAnon.search.result.answered && (
            <div>
                        <span className="text-sm text-gray-400">Answer:</span>
                        <p className="mt-1 text-gray-200 bg-dark-800 p-3 rounded">{askAnon.search.result.answerText}</p>
                      </div>
                    )}

                    {askAnon.search.canShowAnswer && !askAnon.search.result.answered && (
                      <div className="mt-4 pt-4 border-t border-dark-600">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Your Answer
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={askAnon.search.answerText}
                            onChange={(e) => askAnon.search.setAnswerText(e.target.value)}
                            className="input-field flex-1"
                          />
                          <button
                            onClick={askAnon.search.answer}
                            disabled={!askAnon.search.canSubmit}
                            className="btn-primary"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    )}

                    {!askAnon.search.canShowAnswer && !askAnon.search.result.answered && (
                      <div className="mt-4 pt-4 border-t border-dark-600">
                        <p className="text-sm text-gray-500 italic">
                          You are not the target for this question or the answer field is empty.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Questions Tab */}
        {activeTab === "manage" && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 mb-6 max-w-4xl mx-auto">
              <button onClick={askAnon.refreshMine} className="btn-secondary flex-1">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Questions I Asked
              </button>
              <button onClick={askAnon.refreshForMe} className="btn-secondary flex-1">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Questions For Me
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asked By Me */}
              <div className="card">
                <h3 className="text-xl font-bold mb-4 text-primary-400">Questions I Asked</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {Array.isArray(askAnon.listMine) && askAnon.listMine.length > 0 ? (
                    askAnon.listMine.map((it, idx) => (
                      <div key={idx} className="question-card">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-mono text-gray-500">ID: {String(it.id)}</span>
                          <span className={`badge ${it.answered ? "badge-success" : "badge-warning"}`}>
                            {it.answered ? "Answered" : "Pending"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-400">Question:</span>
                            <p className="text-sm text-gray-200 mt-1">{it.questionText}</p>
                          </div>

                          {it.answered && (
            <div>
                              <span className="text-xs text-gray-400">Answer:</span>
                              <p className="text-sm text-gray-200 mt-1 bg-dark-800 p-2 rounded">{it.answerText}</p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-dark-600">
                            <div className="text-xs text-gray-500 mb-1">
                              Encrypted Secret: <span className="font-mono">{String(it.secretHandle).slice(0, 20)}...</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs">
                                <span className="text-gray-500">Decrypted: </span>
                                <span className="font-mono text-primary-400">
                                  {it.clearSecret === undefined ? "Not decrypted yet" : String(it.clearSecret)}
                                </span>
                              </div>
                              <button
                                onClick={() => askAnon.decryptItem("mine", it.id)}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                              >
                                Decrypt
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500">No questions yet</p>
                      <p className="text-sm text-gray-600 mt-1">Create your first question to get started</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Asked To Me */}
              <div className="card">
                <h3 className="text-xl font-bold mb-4 text-primary-400">Questions For Me</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {Array.isArray(askAnon.listForMe) && askAnon.listForMe.length > 0 ? (
                    askAnon.listForMe.map((it, idx) => (
                      <div key={idx} className="question-card">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-mono text-gray-500">ID: {String(it.id)}</span>
                          <span className={`badge ${it.answered ? "badge-success" : "badge-warning"}`}>
                            {it.answered ? "Answered" : "Pending"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-400">Question:</span>
                            <p className="text-sm text-gray-200 mt-1">{it.questionText}</p>
                          </div>

                          {it.answered && (
                            <div>
                              <span className="text-xs text-gray-400">Answer:</span>
                              <p className="text-sm text-gray-200 mt-1 bg-dark-800 p-2 rounded">{it.answerText}</p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-dark-600">
                            <div className="text-xs text-gray-500 mb-1">
                              Encrypted Secret: <span className="font-mono">{String(it.secretHandle).slice(0, 20)}...</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs">
                                <span className="text-gray-500">Decrypted: </span>
                                <span className="font-mono text-primary-400">
                                  {it.clearSecret === undefined ? "Not decrypted yet" : String(it.clearSecret)}
                                </span>
                              </div>
                              <button
                                onClick={() => askAnon.decryptItem("forme", it.id)}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                              >
                                Decrypt
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500">No questions yet</p>
                      <p className="text-sm text-gray-600 mt-1">Questions directed to you will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-dark-700">
        <div className="text-center text-gray-500 text-sm">
          <p>Powered by Zama FHEVM Technology</p>
          <p className="mt-2">Secure, Private, Anonymous</p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const initialMockChains = useMemo(() => ({ 31337: "http://localhost:8545" }), []);
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider initialMockChains={initialMockChains}>
        <AppInner />
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}
