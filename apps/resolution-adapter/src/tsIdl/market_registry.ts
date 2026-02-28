/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/market_registry.json`.
 */
export type MarketRegistry = {
  "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h",
  "metadata": {
    "name": "marketRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "HydraMarket Market Registry"
  },
  "instructions": [
    {
      "name": "assertMarketExpired",
      "discriminator": [
        237,
        113,
        206,
        137,
        17,
        81,
        40,
        155
      ],
      "accounts": [
        {
          "name": "market"
        }
      ],
      "args": []
    },
    {
      "name": "assertMarketOpen",
      "discriminator": [
        145,
        255,
        148,
        29,
        98,
        190,
        221,
        133
      ],
      "accounts": [
        {
          "name": "market"
        }
      ],
      "args": []
    },
    {
      "name": "assertMarketResolved",
      "discriminator": [
        160,
        175,
        137,
        8,
        46,
        172,
        20,
        184
      ],
      "accounts": [
        {
          "name": "market"
        }
      ],
      "args": []
    },
    {
      "name": "cancelMarket",
      "discriminator": [
        205,
        121,
        84,
        210,
        222,
        71,
        150,
        11
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "emergencyFinalizeMarket",
      "discriminator": [
        153,
        22,
        204,
        225,
        117,
        115,
        179,
        186
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Admin authority - the one who created the market or protocol admin"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market to finalize"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "resultOutcome"
            }
          }
        },
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeMarket",
      "discriminator": [
        16,
        225,
        38,
        28,
        213,
        217,
        1,
        247
      ],
      "accounts": [
        {
          "name": "resolutionAdapter",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "resultOutcome"
            }
          }
        }
      ]
    },
    {
      "name": "initializeMarket",
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.market_id"
              }
            ]
          }
        },
        {
          "name": "yesTokenMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "noTokenMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowVault",
          "docs": [
            "Escrow vault PDA (will be initialized by escrow program)",
            "We just validate it matches expected PDA"
          ],
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
            ],
            "program": {
              "kind": "account",
              "path": "escrowProgram"
            }
          }
        },
        {
          "name": "escrowProgram",
          "docs": [
            "Escrow program (for CPI to initialize vault)"
          ]
        },
        {
          "name": "resolutionAdapter",
          "docs": [
            "Resolution adapter account (will be initialized by resolution program)",
            "The resolution program will initialize this account"
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
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeMarketParams"
            }
          }
        }
      ]
    },
    {
      "name": "openMarket",
      "discriminator": [
        116,
        19,
        123,
        75,
        217,
        244,
        69,
        44
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "pauseMarket",
      "discriminator": [
        216,
        238,
        4,
        164,
        65,
        11,
        162,
        91
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "resolvingMarket",
      "discriminator": [
        151,
        156,
        126,
        212,
        48,
        43,
        63,
        23
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "resumeMarket",
      "discriminator": [
        198,
        120,
        104,
        87,
        44,
        103,
        108,
        143
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateMarketMetadata",
      "discriminator": [
        28,
        237,
        190,
        65,
        132,
        24,
        133,
        243
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateMarketMetaDataParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
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
      "name": "marketCancelled",
      "discriminator": [
        139,
        163,
        33,
        168,
        19,
        180,
        81,
        170
      ]
    },
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketMetaDataUpdated",
      "discriminator": [
        254,
        209,
        40,
        167,
        58,
        191,
        133,
        178
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "marketStateChanged",
      "discriminator": [
        234,
        42,
        174,
        121,
        131,
        50,
        195,
        9
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
      "name": "invalidMarketState",
      "msg": "Invalid market state for this operation"
    },
    {
      "code": 6002,
      "name": "marketNotOpen",
      "msg": "Market is not Open Yet"
    },
    {
      "code": 6003,
      "name": "questionEmpty",
      "msg": "Question cannot be empty"
    },
    {
      "code": 6004,
      "name": "marketAlreadyResolved",
      "msg": "Market has already been resolved"
    },
    {
      "code": 6005,
      "name": "marketNotExpired",
      "msg": "Market has not expired yet"
    },
    {
      "code": 6006,
      "name": "marketExpired",
      "msg": "Market has expired"
    },
    {
      "code": 6007,
      "name": "questionTooLong",
      "msg": "Question exceeds maximum length"
    },
    {
      "code": 6008,
      "name": "descriptionTooLong",
      "msg": "Description exceeds maximum length"
    },
    {
      "code": 6009,
      "name": "categoryTooLong",
      "msg": "Category exceeds maximum length"
    },
    {
      "code": 6010,
      "name": "resolutionSourceTooLong",
      "msg": "Resolution source exceeds maximum length"
    },
    {
      "code": 6011,
      "name": "invalidExpiryTimestamp",
      "msg": "Invalid expiry timestamp"
    },
    {
      "code": 6012,
      "name": "expiryTooShort",
      "msg": "Expiry duration too short"
    },
    {
      "code": 6013,
      "name": "expiryTooLong",
      "msg": "Expiry duration too long"
    },
    {
      "code": 6014,
      "name": "marketPaused",
      "msg": "Market is currently paused"
    },
    {
      "code": 6015,
      "name": "marketNotPaused",
      "msg": "Market is not paused"
    },
    {
      "code": 6016,
      "name": "marketAlreadyOpen",
      "msg": "Cannot modify market after trading has started"
    },
    {
      "code": 6017,
      "name": "resolutionWindowNotOpen",
      "msg": "Resolution window has not opened yet"
    },
    {
      "code": 6018,
      "name": "resolutionWindowClosed",
      "msg": "Resolution window has closed"
    },
    {
      "code": 6019,
      "name": "invalidOutcome",
      "msg": "Invalid outcome value"
    },
    {
      "code": 6020,
      "name": "invalidResolutionAdapter",
      "msg": "Caller is not the resolution adapter"
    },
    {
      "code": 6021,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6022,
      "name": "marketIdMismatch",
      "msg": "Market ID mismatch"
    },
    {
      "code": 6023,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint provided"
    },
    {
      "code": 6024,
      "name": "invalidEscrowVault",
      "msg": "Invalid escrow vault provided"
    },
    {
      "code": 6025,
      "name": "invalidInput",
      "msg": "Invalid Input parameter"
    }
  ],
  "types": [
    {
      "name": "initializeMarketParams",
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
            "name": "expireAt",
            "type": "i64"
          },
          {
            "name": "resolutionSource",
            "type": "string"
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
      "name": "marketCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "marketAddress",
            "docs": [
              "Market address"
            ],
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "docs": [
              "Cancellation timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketCreated",
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
            "name": "marketAddress",
            "type": "pubkey"
          },
          {
            "name": "question",
            "type": "string"
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
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expireAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketMetaDataUpdated",
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
            "name": "marketAddress",
            "type": "pubkey"
          },
          {
            "name": "description",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "category",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
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
            "name": "marketAddress",
            "type": "pubkey"
          },
          {
            "name": "marketOutcome",
            "type": {
              "defined": {
                "name": "resultOutcome"
              }
            }
          },
          {
            "name": "resolvedAt",
            "type": "i64"
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
      "name": "marketStateChanged",
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
            "name": "marketAddress",
            "type": "pubkey"
          },
          {
            "name": "oldState",
            "type": {
              "defined": {
                "name": "marketState"
              }
            }
          },
          {
            "name": "newState",
            "type": {
              "defined": {
                "name": "marketState"
              }
            }
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
      "name": "updateMarketMetaDataParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "description",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "category",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    }
  ]
};
