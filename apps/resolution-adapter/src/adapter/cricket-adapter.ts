import axios from 'axios';
import type { ResolutionResult, Outcome } from '../types';

interface CricketMatch {
  id: string;
  name: string;
  status: string;
  matchType: string;
  teams: string[];
  result: string;
}

export class CricketAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  canResolve(resolutionSource: string): boolean {
    return resolutionSource.toLowerCase().includes('cricket') ||
           resolutionSource.toLowerCase().includes('rapidapi');
  }

  async resolve(
    resolutionSource: string,
    question: string
  ): Promise<ResolutionResult | null> {
    try {
      // Parse question to find teams
      // Example: "Will India beat New Zealand?"
      const match = question.match(/Will (.+?) (?:beat|defeat|win against) (.+?)(?:\?|$)/i);

      if (!match) {
        console.warn('⚠️ Could not parse cricket question');
        return null;
      }
      
      const team1 = match[1];
      const team2 = match[2];

      if(!team1){
        throw new Error("Team 1 is missing")
      }

      if(!team2){
        throw new Error("Team 2 is missing")
      }
      console.log(`🏏 Fetching cricket match: ${team1} vs ${team2}`);

      // Fetch recent matches
      const response = await axios.get(
        '<https://cricbuzz-cricket.p.rapidapi.com/matches/v1/recent>',
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
          },
        }
      );

      // Find the match
      const matches = this.parseMatches(response.data);
      const targetMatch = matches.find(m =>
        m.teams.some(t => t.toLowerCase().includes(team1.toLowerCase())) &&
        m.teams.some(t => t.toLowerCase().includes(team2.toLowerCase()))
      );

      if (!targetMatch) {
        console.warn('⚠️ Match not found');
        return null;
      }

      if (!targetMatch.status.toLowerCase().includes("won")) {
        console.log('⏳ Match not finished yet');
        return null;
      }

      console.log(`🏏 Match result: ${targetMatch.result}`);

      // Check if team1 won
      const team1Won = targetMatch.result.toLowerCase().includes(team1.toLowerCase()) &&
                       targetMatch.result.toLowerCase().includes('won');

      return {
        outcome: team1Won ? { yes: {} } : { no: {} },
        confidence: 1.0,  // Official result
        source: 'Cricbuzz (RapidAPI)',
      };
    } catch (error) {
      console.error('❌ Cricket API failed:', error);
      return null;
    }
  }

  private parseMatches(data: any): CricketMatch[] {
    // Parse RapidAPI response structure
    // This depends on the actual API response format
    const matches: CricketMatch[] = [];

    // Example parsing (adjust based on actual API response):
    if (data.typeMatches) {
      for (const typeMatch of data.typeMatches) {
        if (typeMatch.seriesMatches) {
          for (const seriesMatch of typeMatch.seriesMatches) {
            if (seriesMatch.seriesAdWrapper?.matches) {
              for (const matchInfo of seriesMatch.seriesAdWrapper.matches) {
                const match = matchInfo.matchInfo;
                matches.push({
                  id: match.matchId,
                  name: match.matchDesc,
                  status: match.status,
                  matchType: match.matchFormat,
                  teams: [match.team1?.teamName, match.team2?.teamName].filter(Boolean),
                  result: match.status,
                });
              }
            }
          }
        }
      }
    }

    return matches;
  }
}