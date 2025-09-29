"use client";

import { ethers } from "ethers";
import { useCallback, useMemo, useRef, useState } from "react";
import { FhevmInstance } from "../fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "../fhevm/GenericStringStorage";

import { AskAnonABI } from "../abi/AskAnonABI";
import { AskAnonAddresses } from "../abi/AskAnonAddresses";

type DecryptResult = { handle: string; clear: string | bigint | boolean } | undefined;

type QuestionItem = {
  id: bigint;
  asker: string;
  isAnonymous: boolean;
  target: string;
  questionText: string;
  answerText: string;
  answered: boolean;
  bountyWei: bigint;
  secretHandle: unknown;
  clearSecret?: string | bigint | boolean;
};

function getAskAnonByChainId(chainId: number | undefined): {
  abi: typeof AskAnonABI.abi;
  address?: `0x${string}`;
} {
  if (!chainId) {
    return { abi: AskAnonABI.abi } as const;
  }
  const entry = AskAnonAddresses[chainId.toString() as keyof typeof AskAnonAddresses];
  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: AskAnonABI.abi } as const;
  }
  return { abi: AskAnonABI.abi, address: entry.address as `0x${string}` } as const;
}

export const useAskAnon = (parameters: {
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  currentAccount?: string | undefined;
}) => {
  const { instance, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner, fhevmDecryptionSignatureStorage, chainId, currentAccount } = parameters;

  const [message, setMessage] = useState<string>("");
  const [handle, setHandle] = useState<string | undefined>(undefined);
  const [clearSecret, setClearSecret] = useState<string | bigint | boolean | undefined>(undefined);
  const [listMine, setListMine] = useState<ReadonlyArray<QuestionItem> | undefined>(undefined);
  const [listForMe, setListForMe] = useState<ReadonlyArray<QuestionItem> | undefined>(undefined);

  const [formTarget, setFormTarget] = useState<string>("");
  const [formQuestionText, setFormQuestionText] = useState<string>("");
  const [formSecret, setFormSecret] = useState<string>("");
  const [formBounty, setFormBounty] = useState<string>("0");
  const [formIsAnonymous, setFormIsAnonymous] = useState<boolean>(true);

  const [ansId, setAnsId] = useState<string>("");
  const [ansText, setAnsText] = useState<string>("");

  const [decId, setDecId] = useState<string>("");

  // Search by secret
  const [searchSecret, setSearchSecret] = useState<string>("");
  const [searchResult, setSearchResult] = useState<QuestionItem | undefined>(undefined);
  const [answerForSearch, setAnswerForSearch] = useState<string>("");

  const cfg = useMemo(() => getAskAnonByChainId(chainId), [chainId]);

  const canAsk = useMemo(() => {
    return Boolean(cfg.address && instance && ethersSigner && formTarget && formQuestionText && formSecret);
  }, [cfg.address, instance, ethersSigner, formTarget, formQuestionText, formSecret]);

  const canAnswer = useMemo(() => {
    return Boolean(cfg.address && instance && ethersSigner && ansId && ansText);
  }, [cfg.address, instance, ethersSigner, ansId, ansText]);

  const canDecrypt = useMemo(() => {
    return Boolean(cfg.address && instance && ethersSigner && decId);
  }, [cfg.address, instance, ethersSigner, decId]);

  const isTargetForSearch = useMemo(() => {
    if (!cfg.address || !instance || !ethersSigner || !searchResult) return false;
    if (!currentAccount) return false;
    try {
      return (
        (searchResult.target ?? "").toString().toLowerCase() === currentAccount.toLowerCase()
      );
    } catch {
      return false;
    }
  }, [cfg.address, instance, ethersSigner, searchResult, currentAccount]);

  const canSubmitAnswerSearch = useMemo(() => {
    return Boolean(isTargetForSearch && answerForSearch);
  }, [isTargetForSearch, answerForSearch]);

  const ask = useCallback(async () => {
    if (!cfg.address || !instance || !ethersSigner) return;
    const contract = new ethers.Contract(cfg.address, cfg.abi, ethersSigner);

    try {
      const input = instance.createEncryptedInput(cfg.address, ethersSigner.address);
      input.add32(Number(formSecret));
      const enc = await input.encrypt();

      const tx = await contract.askQuestion(
        enc.handles[0],
        enc.inputProof,
        formTarget,
        formQuestionText,
        formIsAnonymous,
        { value: BigInt(formBounty || "0") }
      );
      setMessage(`askQuestion tx=${tx.hash}`);
      await tx.wait();
      setMessage(`askQuestion completed`);
    } catch (e) {
      setMessage(`askQuestion failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, instance, ethersSigner, formSecret, formTarget, formQuestionText, formIsAnonymous, formBounty]);

  const answer = useCallback(async () => {
    if (!cfg.address || !ethersSigner) return;
    const contract = new ethers.Contract(cfg.address, cfg.abi, ethersSigner);
    try {
      const tx = await contract.answerQuestion(
        BigInt(ansId),
        ansText
      );
      setMessage(`answerQuestion tx=${tx.hash}`);
      await tx.wait();
      setMessage(`answerQuestion completed`);
    } catch (e) {
      setMessage(`answerQuestion failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, ethersSigner, ansId, ansText]);

  const decrypt = useCallback(async () => {
    if (!cfg.address || !instance || !ethersSigner || !ethersReadonlyProvider) return;
    setMessage("Start decrypt");
    const thisId = BigInt(decId);
    const ro = new ethers.Contract(cfg.address, cfg.abi, ethersReadonlyProvider);
    try {
      const h = await ro.getQuestionSecret(thisId);
      setHandle(h);
      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [cfg.address],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );
      if (!sig) {
        setMessage("Unable to build FHEVM decryption signature");
        return;
      }
      const res = await instance.userDecrypt(
        [{ handle: h, contractAddress: cfg.address }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );
      setClearSecret(res[h]);
      setMessage("Decrypted");
    } catch (e) {
      setMessage(`Decrypt failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, decId, instance, ethersReadonlyProvider, ethersSigner, fhevmDecryptionSignatureStorage]);

  const decryptListItem = useCallback(
    async (scope: "mine" | "forme", id: bigint) => {
      if (!cfg.address || !instance || !ethersSigner || !ethersReadonlyProvider) return;
      try {
        const ro = new ethers.Contract(cfg.address, cfg.abi, ethersReadonlyProvider);
        const h = await ro.getQuestionSecret(id);
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [cfg.address],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }
        const res = await instance.userDecrypt(
          [{ handle: h, contractAddress: cfg.address }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const clear = res[h as any];
        const updater = (arr: ReadonlyArray<QuestionItem> | undefined) =>
          Array.isArray(arr)
            ? arr.map((it) => (it.id === id ? { ...it, clearSecret: clear } : it))
            : arr;
        if (scope === "mine") {
          setListMine((prev) => updater(prev));
        } else {
          setListForMe((prev) => updater(prev));
        }
      } catch (e) {
        setMessage(`Decrypt item failed: ${String(e)}`);
      }
    },
    [cfg.address, cfg.abi, instance, ethersSigner, ethersReadonlyProvider, fhevmDecryptionSignatureStorage]
  );

  const refreshMine = useCallback(async () => {
    if (!cfg.address || !ethersReadonlyProvider || !ethersSigner) return;
    const ro = new ethers.Contract(cfg.address, cfg.abi, ethersReadonlyProvider);
    try {
      const ids: bigint[] = await ro.listByAsker(ethersSigner.address);
      const details: QuestionItem[] = await Promise.all(
        ids.map(async (qid: bigint) => {
          const q = await ro.getQuestion(qid);
          const h = await ro.getQuestionSecret(qid);
          return {
            id: qid,
            asker: q[0] as string,
            isAnonymous: Boolean(q[1]),
            target: q[2] as string,
            questionText: q[3] as string,
            answerText: q[4] as string,
            answered: Boolean(q[5]),
            bountyWei: BigInt(q[6]),
            secretHandle: h,
          };
        })
      );
      setListMine(details);
    } catch (e) {
      setMessage(`listByAsker failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, ethersReadonlyProvider, ethersSigner]);

  const refreshForMe = useCallback(async () => {
    if (!cfg.address || !ethersReadonlyProvider || !ethersSigner) return;
    const ro = new ethers.Contract(cfg.address, cfg.abi, ethersReadonlyProvider);
    try {
      const ids: bigint[] = await ro.listByTarget(ethersSigner.address);
      const details: QuestionItem[] = await Promise.all(
        ids.map(async (qid: bigint) => {
          const q = await ro.getQuestion(qid);
          const h = await ro.getQuestionSecret(qid);
          return {
            id: qid,
            asker: q[0] as string,
            isAnonymous: Boolean(q[1]),
            target: q[2] as string,
            questionText: q[3] as string,
            answerText: q[4] as string,
            answered: Boolean(q[5]),
            bountyWei: BigInt(q[6]),
            secretHandle: h,
          };
        })
      );
      setListForMe(details);
    } catch (e) {
      setMessage(`listByTarget failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, ethersReadonlyProvider, ethersSigner]);

  const searchBySecret = useCallback(async () => {
    if (!cfg.address || !instance || !ethersSigner || !ethersReadonlyProvider) return;
    if (!searchSecret) return;
    try {
      const ro = new ethers.Contract(cfg.address, cfg.abi, ethersReadonlyProvider);
      const ids: bigint[] = await ro.listByTarget(ethersSigner.address);
      if (!ids || ids.length === 0) {
        setSearchResult(undefined);
        setMessage("No questions for me");
        return;
      }
      const items: QuestionItem[] = await Promise.all(
        ids.map(async (qid) => {
          const q = await ro.getQuestion(qid);
          const h = await ro.getQuestionSecret(qid);
          return {
            id: qid,
            asker: q[0] as string,
            isAnonymous: Boolean(q[1]),
            target: q[2] as string,
            questionText: q[3] as string,
            answerText: q[4] as string,
            answered: Boolean(q[5]),
            bountyWei: BigInt(q[6]),
            secretHandle: h,
          };
        })
      );
      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [cfg.address],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );
      if (!sig) {
        setMessage("Unable to build FHEVM decryption signature");
        return;
      }
      const decryptInputs = items.map((it) => ({ handle: it.secretHandle as any, contractAddress: cfg.address! }));
      const decrypted = await instance.userDecrypt(
        decryptInputs,
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );
      const wanted = BigInt(searchSecret);
      const found = items.find((it) => {
        const clear = decrypted[it.secretHandle as any];
        try {
          return BigInt(clear as any) === wanted;
        } catch {
          return false;
        }
      });
      if (!found) {
        setSearchResult(undefined);
        setMessage("No question matches the provided secret");
        return;
      }
      setSearchResult(found);
      setMessage("Search matched a question");
    } catch (e) {
      setMessage(`Search failed: ${String(e)}`);
    }
  }, [cfg.address, instance, ethersSigner, ethersReadonlyProvider, fhevmDecryptionSignatureStorage, searchSecret]);

  const answerSearched = useCallback(async () => {
    if (!cfg.address || !ethersSigner || !searchResult) return;
    try {
      const contract = new ethers.Contract(cfg.address, cfg.abi, ethersSigner);
      const tx = await contract.answerQuestion(searchResult.id, answerForSearch);
      setMessage(`answerQuestion tx=${tx.hash}`);
      await tx.wait();
      setMessage(`answerQuestion completed`);
      // optimistic update
      setSearchResult((prev) => (prev ? { ...prev, answered: true, answerText: answerForSearch } : prev));
    } catch (e) {
      setMessage(`answerQuestion failed: ${String(e)}`);
    }
  }, [cfg.address, cfg.abi, ethersSigner, searchResult, answerForSearch]);

  return {
    message,
    handle,
    clearSecret,
    listMine,
    listForMe,
    canAsk,
    canAnswer,
    canDecrypt,
    ask,
    answer,
    decryptItem: decryptListItem,
    decrypt,
    refreshMine,
    refreshForMe,
    search: {
      value: searchSecret,
      setValue: setSearchSecret,
      execute: searchBySecret,
      result: searchResult,
      canShowAnswer: isTargetForSearch,
      canSubmit: canSubmitAnswerSearch,
      answerText: answerForSearch,
      setAnswerText: setAnswerForSearch,
      answer: answerSearched,
    },
    form: {
      target: formTarget,
      questionText: formQuestionText,
      secret: formSecret,
      bounty: formBounty,
      isAnonymous: formIsAnonymous,
    },
    formSetters: {
      setTarget: setFormTarget,
      setQuestionText: setFormQuestionText,
      setSecret: setFormSecret,
      setBounty: setFormBounty,
      setIsAnonymous: setFormIsAnonymous,
    },
      formAnswer: { id: ansId, text: ansText },
      formAnswerSetters: { setId: setAnsId, setText: setAnsText },
    formDecrypt: { id: decId },
    formDecryptSetters: { setId: setDecId },
  } as const;
};


