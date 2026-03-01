/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow_vault.json`.
 */
export type EscrowVault = {
  "address": "CRyAfXPmf11myj8X1dZ3AdjSfwXEjB5Ep4HpXmf6D6QP",
  "metadata": {
    "name": "escrowVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "HydraMarket Escrow Vault"
  },
  "instructions": [
    {
      "name": "claimPayout",
      "discriminator": [
        127,
        240,
        132,
        62,
        227,
        198,
        146,
        133
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.market",
                "account": "escrowVault"
              }
            ]
          }
        },
        {
          "name": "market"
        },
        {
          "name": "usdcVault",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "yesTokenMint",
          "writable": true
        },
        {
          "name": "noTokenMint",
          "writable": true
        },
        {
          "name": "userYesAccount",
          "writable": true
        },
        {
          "name": "userNoAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeVault",
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account from MarketRegistry (for validation)"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "yesTokenMint"
        },
        {
          "name": "noTokenMint"
        },
        {
          "name": "marketRegisteryProgram",
          "docs": [
            "Market registry program (for CPI validation)"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "mintPairs",
      "discriminator": [
        63,
        216,
        104,
        77,
        215,
        189,
        83,
        81
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.market",
                "account": "escrowVault"
              }
            ]
          }
        },
        {
          "name": "market"
        },
        {
          "name": "marketRegistryProgram",
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        },
        {
          "name": "usdcVault",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "hotWalletUsdc",
          "writable": true
        },
        {
          "name": "yesTokenMint",
          "writable": true
        },
        {
          "name": "noTokenMint",
          "writable": true
        },
        {
          "name": "yesRecipient",
          "writable": true
        },
        {
          "name": "noRecipient",
          "docs": [
            "NO token recipient account (user who buys NO)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "pairs",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pauseMinting",
      "discriminator": [
        15,
        247,
        181,
        3,
        81,
        145,
        229,
        68
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.market",
                "account": "escrowVault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "resumeMinting",
      "discriminator": [
        85,
        46,
        64,
        227,
        250,
        67,
        42,
        157
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.market",
                "account": "escrowVault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "settle",
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.market",
                "account": "escrowVault"
              }
            ]
          }
        },
        {
          "name": "market"
        },
        {
          "name": "marketRegistryProgram",
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrowVault",
      "discriminator": [
        54,
        84,
        41,
        149,
        160,
        181,
        85,
        114
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    }
  ],
  "events": [
    {
      "name": "mintingPaused",
      "discriminator": [
        46,
        27,
        29,
        35,
        231,
        194,
        1,
        191
      ]
    },
    {
      "name": "mintingResumed",
      "discriminator": [
        25,
        135,
        109,
        11,
        28,
        217,
        34,
        247
      ]
    },
    {
      "name": "pairsMinted",
      "discriminator": [
        108,
        154,
        184,
        215,
        50,
        138,
        35,
        141
      ]
    },
    {
      "name": "payoutClaimed",
      "discriminator": [
        200,
        39,
        105,
        112,
        116,
        63,
        58,
        149
      ]
    },
    {
      "name": "settlementInitialized",
      "discriminator": [
        81,
        142,
        61,
        128,
        50,
        41,
        79,
        189
      ]
    },
    {
      "name": "vaultInitialized",
      "discriminator": [
        180,
        43,
        207,
        2,
        18,
        71,
        3,
        75
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized: Only admin can perform this action"
    },
    {
      "code": 6001,
      "name": "marketNotOpen",
      "msg": "Market is not in OPEN state"
    },
    {
      "code": 6002,
      "name": "marketNotResolved",
      "msg": "Market has not been resolved yet"
    },
    {
      "code": 6003,
      "name": "alreadySettled",
      "msg": "Market has already been settled"
    },
    {
      "code": 6004,
      "name": "notSettled",
      "msg": "Vault has not been settled yet"
    },
    {
      "code": 6005,
      "name": "insufficientCollateral",
      "msg": "Insufficient collateral provided"
    },
    {
      "code": 6006,
      "name": "collateralNotReceived",
      "msg": "Collateral verification failed - vault balance did not increase"
    },
    {
      "code": 6007,
      "name": "invalidPairCount",
      "msg": "Invalid number of pairs (must be > 0)"
    },
    {
      "code": 6008,
      "name": "invalidVaultState",
      "msg": "balance After Transfer is less than before"
    },
    {
      "code": 6009,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6010,
      "name": "arithmeticUnderflow",
      "msg": "Arithmetic underflow occurred"
    },
    {
      "code": 6011,
      "name": "invariantViolationSupplyMismatch",
      "msg": "CRITICAL: Invariant violation - YES supply != NO supply"
    },
    {
      "code": 6012,
      "name": "invariantViolationCollateralMismatch",
      "msg": "CRITICAL: Invariant violation - Supply != Collateral"
    },
    {
      "code": 6013,
      "name": "invalidOutcome",
      "msg": "Invalid market outcome"
    },
    {
      "code": 6014,
      "name": "noTokensToClaim",
      "msg": "User has no tokens to claim"
    },
    {
      "code": 6015,
      "name": "invalidRecipientAccount",
      "msg": "Invalid recipient token account"
    },
    {
      "code": 6016,
      "name": "payoutCalculationFailed",
      "msg": "Payout calculation failed"
    },
    {
      "code": 6017,
      "name": "tokenBurnFailed",
      "msg": "Token burn failed"
    },
    {
      "code": 6018,
      "name": "tokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6019,
      "name": "mintingPaused",
      "msg": "Minting is currently paused"
    },
    {
      "code": 6020,
      "name": "mintingNotPaused",
      "msg": "Minting is not paused"
    },
    {
      "code": 6021,
      "name": "batchSizeExceeded",
      "msg": "Batch size exceeds maximum"
    },
    {
      "code": 6022,
      "name": "invalidVaultAuthority",
      "msg": "Invalid vault authority"
    },
    {
      "code": 6023,
      "name": "marketRegistryMismatch",
      "msg": "Market registry mismatch"
    },
    {
      "code": 6024,
      "name": "tokenMintMismatch",
      "msg": "Token mint mismatch"
    },
    {
      "code": 6025,
      "name": "usdcVaultMismatch",
      "msg": "USDC vault mismatch"
    }
  ],
  "types": [
    {
      "name": "escrowVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "mrarketRegisteryProgram",
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "type": "pubkey"
          },
          {
            "name": "yesTokenMint",
            "type": "pubkey"
          },
          {
            "name": "noTokenMint",
            "type": "pubkey"
          },
          {
            "name": "totalLockedCollateral",
            "type": "u64"
          },
          {
            "name": "totalYesMinted",
            "type": "u64"
          },
          {
            "name": "totalNoMinted",
            "type": "u64"
          },
          {
            "name": "isSettled",
            "type": "bool"
          },
          {
            "name": "isMintingPaused",
            "type": "bool"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "question",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expireAt",
            "type": "i64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "marketState"
              }
            }
          },
          {
            "name": "yesTokenMint",
            "type": "pubkey"
          },
          {
            "name": "noTokenMint",
            "type": "pubkey"
          },
          {
            "name": "escrowVault",
            "type": "pubkey"
          },
          {
            "name": "resolutionAdapter",
            "type": "pubkey"
          },
          {
            "name": "resolutionSource",
            "type": "string"
          },
          {
            "name": "resolutionOutcome",
            "type": {
              "option": {
                "defined": {
                  "name": "resultOutcome"
                }
              }
            }
          },
          {
            "name": "resolvedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "close"
          },
          {
            "name": "created"
          },
          {
            "name": "resolved"
          },
          {
            "name": "resolving"
          },
          {
            "name": "paused"
          }
        ]
      }
    },
    {
      "name": "mintingPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mintingResumed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pairsMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "yesRecipient",
            "type": "pubkey"
          },
          {
            "name": "noRecipient",
            "type": "pubkey"
          },
          {
            "name": "pairs",
            "type": "u64"
          },
          {
            "name": "collateralLocked",
            "type": "u64"
          },
          {
            "name": "totalLocked",
            "type": "u64"
          },
          {
            "name": "totalYesMinted",
            "type": "u64"
          },
          {
            "name": "totalNoMinted",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "payoutClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "payoutAmount",
            "type": "u64"
          },
          {
            "name": "yesBurned",
            "type": "u64"
          },
          {
            "name": "noBurned",
            "type": "u64"
          },
          {
            "name": "remaningCollateral",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "resultOutcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "yes"
          },
          {
            "name": "no"
          },
          {
            "name": "invalid"
          }
        ]
      }
    },
    {
      "name": "settlementInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "totalCollateral",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "type": "pubkey"
          },
          {
            "name": "yesTokenMint",
            "type": "pubkey"
          },
          {
            "name": "noTokenMint",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
