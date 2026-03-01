/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/resolution_adapter.json`.
 */
export type ResolutionAdapter = {
  "address": "HiXBiQDjtvMCW4K6xsgyCrEf7zH1zkWuAtGqshSSfJL9",
  "metadata": {
    "name": "resolutionAdapter",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "HydraMarket Resolution Adapter"
  },
  "instructions": [
    {
      "name": "disputeProposal",
      "docs": [
        "Dispute an existing proposal"
      ],
      "discriminator": [
        243,
        93,
        145,
        52,
        145,
        32,
        171,
        103
      ],
      "accounts": [
        {
          "name": "disputer",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolutionProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "resolution_proposal.market",
                "account": "resolutionProposal"
              }
            ]
          }
        },
        {
          "name": "bondVault",
          "writable": true
        },
        {
          "name": "disputeBonderAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "counterOutcome",
          "type": {
            "defined": {
              "name": "resultOutcome"
            }
          }
        },
        {
          "name": "reason",
          "type": "string"
        },
        {
          "name": "bondAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyResolve",
      "docs": [
        "Emergency resolution (admin only)"
      ],
      "discriminator": [
        63,
        112,
        185,
        42,
        47,
        61,
        232,
        79
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Admin/multi-sig authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market account (from MarketRegistry)"
          ]
        },
        {
          "name": "marketRegistryProgram",
          "docs": [
            "Market Registry program"
          ],
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        },
        {
          "name": "resolutionProposal",
          "docs": [
            "Resolution proposal PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
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
          "name": "bondVault",
          "docs": [
            "Bond vault (holds all bonds)"
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
          "name": "forcedOutcome",
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
      "name": "finalizeOutcome",
      "docs": [
        "Finalize outcome after dispute window"
      ],
      "discriminator": [
        122,
        242,
        226,
        81,
        187,
        211,
        79,
        179
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "rewardAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "marketRegisteryProgram",
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        },
        {
          "name": "resolutionProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
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
          "name": "bondVault",
          "writable": true
        },
        {
          "name": "winnerAccount",
          "docs": [
            "Winner's USDC account (receives bond + reward)"
          ],
          "writable": true
        },
        {
          "name": "protocolTreasury",
          "docs": [
            "Protocol treasury (source of rewards)"
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
          "name": "finalOutcome",
          "type": {
            "defined": {
              "name": "resultOutcome"
            }
          }
        }
      ]
    },
    {
      "name": "initializeResolution",
      "docs": [
        "Initialize resolution proposal account for a market"
      ],
      "discriminator": [
        114,
        234,
        73,
        65,
        38,
        194,
        180,
        145
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "CHECK : validate via seeds"
          ]
        },
        {
          "name": "resolutionProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
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
          "name": "bondVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
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
          "name": "bondMint",
          "docs": [
            "CHECK : validation by constraint"
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
          "name": "category",
          "type": {
            "defined": {
              "name": "marketCategory"
            }
          }
        }
      ]
    },
    {
      "name": "proposeCryptoOutcome",
      "docs": [
        "Propose outcome for crypto market using price oracles"
      ],
      "discriminator": [
        112,
        219,
        31,
        226,
        70,
        101,
        48,
        154
      ],
      "accounts": [
        {
          "name": "proposer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "marketRegistryProgram",
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        },
        {
          "name": "resolutionProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
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
          "name": "bondVault",
          "writable": true
        },
        {
          "name": "proposerBondAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "pair",
          "type": "string"
        },
        {
          "name": "condition",
          "type": {
            "defined": {
              "name": "priceCondition"
            }
          }
        },
        {
          "name": "feedIds",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "bondAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proposeSportsOutcome",
      "docs": [
        "Propose outcome for sports market using event data"
      ],
      "discriminator": [
        243,
        83,
        51,
        236,
        42,
        219,
        179,
        60
      ],
      "accounts": [
        {
          "name": "proposer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "marketRegisteryProgram",
          "address": "H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h"
        },
        {
          "name": "resolutionProposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
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
          "name": "bondVault",
          "writable": true
        },
        {
          "name": "proposerBondAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "eventId",
          "type": "string"
        },
        {
          "name": "eventType",
          "type": {
            "defined": {
              "name": "sportsEventType"
            }
          }
        },
        {
          "name": "oracleData",
          "type": {
            "vec": {
              "defined": {
                "name": "sportsOracleData"
              }
            }
          }
        },
        {
          "name": "bondAmount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "resolutionProposal",
      "discriminator": [
        188,
        203,
        94,
        223,
        208,
        121,
        225,
        38
      ]
    }
  ],
  "events": [
    {
      "name": "cryptoPriceValidated",
      "discriminator": [
        18,
        224,
        82,
        177,
        106,
        5,
        211,
        120
      ]
    },
    {
      "name": "emergencyResolution",
      "discriminator": [
        34,
        20,
        172,
        199,
        129,
        249,
        162,
        199
      ]
    },
    {
      "name": "outcomeFinalized",
      "discriminator": [
        54,
        198,
        29,
        175,
        20,
        68,
        238,
        233
      ]
    },
    {
      "name": "proposalDispute",
      "discriminator": [
        154,
        44,
        52,
        232,
        238,
        161,
        183,
        61
      ]
    },
    {
      "name": "proposalSumbitted",
      "discriminator": [
        74,
        17,
        3,
        117,
        100,
        131,
        64,
        87
      ]
    },
    {
      "name": "sportsEventvalidated",
      "discriminator": [
        145,
        133,
        177,
        175,
        178,
        93,
        41,
        65
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketNotExpired",
      "msg": "Market has not expired yet"
    },
    {
      "code": 6001,
      "name": "marketNotOpen",
      "msg": "Market is not in OPEN state"
    },
    {
      "code": 6002,
      "name": "insufficientBond",
      "msg": "Proposal bond is below minimum required"
    },
    {
      "code": 6003,
      "name": "disputeWindowOpen",
      "msg": "Dispute window has not closed yet"
    },
    {
      "code": 6004,
      "name": "disputeWindowClosed",
      "msg": "Dispute window has already closed"
    },
    {
      "code": 6005,
      "name": "proposalAlreadyExists",
      "msg": "Resolution proposal already exists"
    },
    {
      "code": 6006,
      "name": "noActiveProposal",
      "msg": "No active proposal found"
    },
    {
      "code": 6007,
      "name": "alreadyFinalized",
      "msg": "Already finalized"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "Caller is not authorized"
    },
    {
      "code": 6009,
      "name": "invalidOutcome",
      "msg": "Invalid outcome provided"
    },
    {
      "code": 6010,
      "name": "tooManyDataSources",
      "msg": "Too many data sources (max 5)"
    },
    {
      "code": 6011,
      "name": "noDataSources",
      "msg": "No data sources provided"
    },
    {
      "code": 6012,
      "name": "staleOracleData",
      "msg": "Oracle data is too stale"
    },
    {
      "code": 6013,
      "name": "priceDeviationTooHigh",
      "msg": "Price feeds do not agree (deviation too high)"
    },
    {
      "code": 6014,
      "name": "lowPriceConfidence",
      "msg": "Pyth price confidence too low"
    },
    {
      "code": 6015,
      "name": "invalidPythAccount",
      "msg": "Invalid Pyth price account"
    },
    {
      "code": 6016,
      "name": "invalidSwitchboardAccount",
      "msg": "Invalid Switchboard aggregator"
    },
    {
      "code": 6017,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6018,
      "name": "arithmeticUnderflow",
      "msg": "Arithmetic underflow"
    },
    {
      "code": 6019,
      "name": "invalidMarketCategory",
      "msg": "Invalid market category for this oracle type"
    },
    {
      "code": 6020,
      "name": "priceConditionNotMet",
      "msg": "Price condition not met"
    },
    {
      "code": 6021,
      "name": "invalidEventOutcome",
      "msg": "Event outcome does not match any valid option"
    },
    {
      "code": 6022,
      "name": "dataSourceDisagreement",
      "msg": "Multiple data sources disagree on outcome"
    },
    {
      "code": 6023,
      "name": "cannotDisputeOwnProposal",
      "msg": "Cannot dispute own proposal"
    },
    {
      "code": 6024,
      "name": "insufficientDisputeBond",
      "msg": "Dispute bond must be equal or greater than original bond"
    },
    {
      "code": 6025,
      "name": "maxDisputesReached",
      "msg": "Maximum disputes reached"
    },
    {
      "code": 6026,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6027,
      "name": "marketRegistryMismatch",
      "msg": "Market registry mismatch"
    },
    {
      "code": 6028,
      "name": "bondVaultMismatch",
      "msg": "Bond vault mismatch"
    },
    {
      "code": 6029,
      "name": "invalidAccountCount",
      "msg": "Invalid account count"
    },
    {
      "code": 6030,
      "name": "unauthorizedAdmin",
      "msg": "Unauthorized admin"
    }
  ],
  "types": [
    {
      "name": "bondContributor",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "participant",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "cryptoPriceValidated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "pair",
            "type": "string"
          },
          {
            "name": "oracleType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "confidence",
            "type": {
              "option": "u64"
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
      "name": "dataSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sourceType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "identifer",
            "type": "string"
          },
          {
            "name": "oracleAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "value",
            "type": {
              "defined": {
                "name": "oracleValue"
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
      "name": "disputeProposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "disputer",
            "type": "pubkey"
          },
          {
            "name": "counterOutcome",
            "type": {
              "defined": {
                "name": "resultOutcome"
              }
            }
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "emergencyResolution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
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
          },
          {
            "name": "refundedAmount",
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
      "name": "marketCategory",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "crypto"
          },
          {
            "name": "sports"
          }
        ]
      }
    },
    {
      "name": "oracleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pyth"
          },
          {
            "name": "switchboard"
          },
          {
            "name": "api3"
          },
          {
            "name": "rapidApi"
          },
          {
            "name": "manual"
          }
        ]
      }
    },
    {
      "name": "oracleValue",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "price",
            "fields": [
              "i64"
            ]
          },
          {
            "name": "event",
            "fields": [
              "string"
            ]
          },
          {
            "name": "boolean",
            "fields": [
              "bool"
            ]
          }
        ]
      }
    },
    {
      "name": "outcomeFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "resultOutcome"
              }
            }
          },
          {
            "name": "winningProposer",
            "type": "pubkey"
          },
          {
            "name": "wasDisputed",
            "type": "bool"
          },
          {
            "name": "slashedAmount",
            "type": "u64"
          },
          {
            "name": "rewardAmount",
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
      "name": "priceCondition",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "greaterOrEqual",
            "fields": [
              {
                "name": "target",
                "type": "i64"
              }
            ]
          },
          {
            "name": "lessOrEqual",
            "fields": [
              {
                "name": "target",
                "type": "i64"
              }
            ]
          },
          {
            "name": "between",
            "fields": [
              {
                "name": "min",
                "type": "i64"
              },
              {
                "name": "max",
                "type": "i64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "proposalDispute",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "disputer",
            "type": "pubkey"
          },
          {
            "name": "counterOutcome",
            "type": {
              "defined": {
                "name": "resultOutcome"
              }
            }
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "newDeadline",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalSumbitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "resultOutcome"
              }
            }
          },
          {
            "name": "category",
            "type": {
              "defined": {
                "name": "marketCategory"
              }
            }
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "dataSourceCount",
            "type": "u8"
          },
          {
            "name": "disputeDeadline",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "resolutionProposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "proposedOutcome",
            "type": {
              "option": {
                "defined": {
                  "name": "resultOutcome"
                }
              }
            }
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "proposalTimestamp",
            "type": "i64"
          },
          {
            "name": "disputeDeadline",
            "type": "i64"
          },
          {
            "name": "category",
            "type": {
              "defined": {
                "name": "marketCategory"
              }
            }
          },
          {
            "name": "dataSource",
            "type": {
              "vec": {
                "defined": {
                  "name": "dataSource"
                }
              }
            }
          },
          {
            "name": "isDisputed",
            "type": "bool"
          },
          {
            "name": "isFinalized",
            "type": "bool"
          },
          {
            "name": "disputes",
            "type": {
              "vec": {
                "defined": {
                  "name": "disputeProposal"
                }
              }
            }
          },
          {
            "name": "bondVault",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "bondContributors",
            "type": {
              "vec": {
                "defined": {
                  "name": "bondContributor"
                }
              }
            }
          },
          {
            "name": "isEmergencyResolved",
            "type": "bool"
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
      "name": "sportsEventType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "winner"
          },
          {
            "name": "scoreThreshold"
          },
          {
            "name": "yesNo"
          }
        ]
      }
    },
    {
      "name": "sportsEventvalidated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "eventId",
            "type": "string"
          },
          {
            "name": "oracleType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "result",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sportsOracleData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sourceType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "sourceName",
            "type": "string"
          },
          {
            "name": "oracleAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "result",
            "type": "string"
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
