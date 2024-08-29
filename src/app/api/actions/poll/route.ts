// /**
//  * Solana Action chaining example
//  */

// import {
//     ActionPostResponse,
//     createPostResponse,
//     MEMO_PROGRAM_ID,
//     ActionGetResponse,
//     ActionPostRequest,
//     createActionHeaders,
//     ActionError,
//   } from "@solana/actions";
//   import {
//     clusterApiUrl,
//     ComputeBudgetProgram,
//     Connection,
//     PublicKey,
//     Transaction,
//     TransactionInstruction,
//   } from "@solana/web3.js";
  
//   // create the standard headers for this route (including CORS)
//   const headers = createActionHeaders();
  
//   export const GET = async (req: Request) => {
//     const payload: ActionGetResponse = {
//       type: "action",
//       title: "Community Sentiment Poll",
//       icon: new URL("/solana_devs.jpg", new URL(req.url).origin).toString(),
//       description: "Send It Higher?",
//       label: "Poll",
//       links: {
//         actions: [
//           {
//             href: "/api/actions/poll",
//             label: "FORK YES",
//             parameters: [
//               {
//                 // patternDescription: "Say HIGHER",
//                 name: "memo",
//                 label: "Say HIGHER!",
//                 type: "textarea",
//               },
//             ],
//           },
//           {
//               href: "/api/actions/poll",
//               label: "NGMI",
//           },
//         ],
//       },
//     };
  
//     return Response.json(payload, {
//       headers,
//     });
//   };
  
//   // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
//   // THIS WILL ENSURE CORS WORKS FOR BLINKS
//   export const OPTIONS = async () => Response.json(null, { headers });
  
//   export const POST = async (req: Request) => {
//     try {
//       /**
//        * we can type the `body.data` to what fields we expect from the GET response above
//        *
//        * NOTE: there is currently a bug in the blinks sdk that will
//        * result in the body data being passed in `body.data` OR `body.params`
//        * (it should always be `body.data`). so we are handling that scenario here
//        *
//        * todo: remove this workaround when that bug is fixed and rolled out to wallets
//        */
//       const body: ActionPostRequest<{ memo: string }> & {
//         params: ActionPostRequest<{ memo: string }>["data"];
//       } = await req.json();
//       // const body: ActionPostRequest = await req.json();
  
//       // body will contain the user's `account` and `memo` input from the user
//       console.log("body:", body);
  
//       let account: PublicKey;
//       try {
//         account = new PublicKey(body.account);
//       } catch (err) {
//         throw 'Invalid "account" provided';
//       }
  
//       // read in the user input `memo` value
//       // todo: see note above on `body`
//       const memoMessage = (body.params?.memo || body.data?.memo) as
//         | string
//         | undefined;
  
//       // todo: for simplicity, we are not doing any much validation on this user input
//       if (!memoMessage) {
//         throw 'Invalid "memo" provided';
//       }
  
//       const connection = new Connection(
//         process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
//       );
  
//       const transaction = new Transaction().add(
//         // note: `createPostResponse` requires at least 1 non-memo instruction
//         ComputeBudgetProgram.setComputeUnitPrice({
//           microLamports: 1000,
//         }),
//         new TransactionInstruction({
//           programId: new PublicKey(MEMO_PROGRAM_ID),
//           data: Buffer.from(memoMessage, "utf8"),
//           keys: [],
//         }),
//       );
  
//       // set the end user as the fee payer
//       transaction.feePayer = account;
  
//       transaction.recentBlockhash = (
//         await connection.getLatestBlockhash()
//       ).blockhash;
  
//       const payload: ActionPostResponse = await createPostResponse({
//         fields: {
//           transaction,
//           // message: "Post this memo on-chain",
//           message: memoMessage,               // 
//           links: {
//             /**
//              * this `href` will receive a POST request (callback)
//              * with the confirmed `signature`
//              *
//              * you could also use query params to track whatever step you are on
//              */
//             next: {
//               type: "post",
//               href: "/api/actions/poll/next-action",
//             },
//           },
//         },
//         // no additional signers are required for this transaction
//         // signers: [],
//       });
  
//       return Response.json(payload, {
//         headers,
//       });
//     } catch (err) {
//       console.log(err);
//       let actionError: ActionError = { message: "An unknown error occurred" };
//       if (typeof err == "string") actionError.message = err;
//       return Response.json(actionError, {
//         status: 400,
//         headers,
//       });
//     }
//   };

/**
 * Solana Actions Example
 */

import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DEFAULT_SOL_ADDRESS, DEFAULT_SOL_AMOUNT } from "./const";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { toPubkey } = validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/transfer-sol?to=${toPubkey.toBase58()}`,
      requestUrl.origin,
    ).toString();

    const payload: ActionGetResponse = {
      type: "action",
      title: "solana.says",
      icon: new URL("/solana_devs.jpg", requestUrl.origin).toString(),
      description: "",
      label: "Poll", // this value will be ignored since `links.actions` exists
      links: {
        actions: [
          {
            label: "Send it. HIGHER.", // button text
            href: `${baseHref}&amount=${"0.0001"}`,
          },
          {
            label: "Send ngmi ;(", // button text
            href: `${baseHref}&amount=${"0.0001"}`,
          },
        ],
      },
    };

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { amount, toPubkey } = validatedQueryParams(requestUrl);

    const body: ActionPostRequest = await req.json();

    // validate the client provided input
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
    );

    // ensure the receiving account will be rent exempt
    const minimumBalance = await connection.getMinimumBalanceForRentExemption(
      0, // note: simple accounts that just store native SOL have `0` bytes of data
    );
    if (amount * LAMPORTS_PER_SOL < minimumBalance) {
      throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
    }

    // create an instruction to transfer native SOL from one wallet to another
    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    // get the latest blockhash amd block height
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // create a legacy transaction
    const transaction = new Transaction({   
      feePayer: account,
      blockhash,
      lastValidBlockHeight,
    }).add(transferSolInstruction);

    // versioned transactions are also supported
    // const transaction = new VersionedTransaction(
    //   new TransactionMessage({
    //     payerKey: account,
    //     recentBlockhash: blockhash,
    //     instructions: [transferSolInstruction],
    //   }).compileToV0Message(),
    //   // note: you can also use `compileToLegacyMessage`
    // );

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
      },
      // note: no additional signers are needed
      // signers: [],
    });

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};

function validatedQueryParams(requestUrl: URL) {
  let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
  let amount: number = DEFAULT_SOL_AMOUNT;

  try {
    if (requestUrl.searchParams.get("to")) {
      toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
    }
  } catch (err) {
    throw "Invalid input query parameter: to";
  }

  try {
    if (requestUrl.searchParams.get("amount")) {
      amount = parseFloat(requestUrl.searchParams.get("amount")!);
    }

    if (amount <= 0) throw "amount is too small";
  } catch (err) {
    throw "Invalid input query parameter: amount";
  }

  return {
    amount,
    toPubkey,
  };
}