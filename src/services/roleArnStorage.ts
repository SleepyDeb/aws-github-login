/**
 * Role ARN Storage Service
 * Manages role ARN history in browser localStorage
 * Provides functionality to store, retrieve, and manage previously used role ARNs
 */

import type { RoleArnHistory, RoleArnHistoryItem } from '../types/aws.js';
import { AWS_ROLE_ARN_PATTERN, AWS_CONSTANTS } from '../types/aws.js';

const STORAGE_KEY = 'aws_role_arn_history';

/**
 * Role ARN Storage Service class
 */
export class RoleArnStorageService {
    private maxItems: number;

    constructor(maxItems: number = AWS_CONSTANTS.MAX_ROLE_HISTORY) {
        this.maxItems = maxItems;
    }

    /**
     * Validates if a string is a valid AWS IAM Role ARN
     * @param arn - The ARN string to validate
     * @returns True if valid, false otherwise
     */
    private isValidRoleArn(arn: string): boolean {
        return AWS_ROLE_ARN_PATTERN.test(arn);
    }

    /**
     * Extracts role name from ARN
     * @param arn - The role ARN
     * @returns The role name
     */
    private extractRoleName(arn: string): string {
        const match = arn.match(/arn:aws:iam::\d{12}:role\/(.+)$/);
        return match && match[1] ? match[1] : 'Unknown';
    }

    /**
     * Extracts AWS account ID from ARN
     * @param arn - The role ARN
     * @returns The AWS account ID
     */
    private extractAccountId(arn: string): string {
        const match = arn.match(/arn:aws:iam::(\d{12}):role\/.+$/);
        return match && match[1] ? match[1] : 'Unknown';
    }

    /**
     * Gets the current role ARN history from localStorage
     * @returns Role ARN history object
     */
    private getHistory(): RoleArnHistory {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return {
                    roles: [],
                    maxItems: this.maxItems
                };
            }

            const parsed = JSON.parse(stored) as RoleArnHistory;
            
            // Validate the structure
            if (!parsed.roles || !Array.isArray(parsed.roles)) {
                console.warn('Invalid role ARN history structure, resetting');
                return {
                    roles: [],
                    maxItems: this.maxItems
                };
            }

            // Ensure maxItems is set
            parsed.maxItems = this.maxItems;

            return parsed;
        } catch (error) {
            console.error('Failed to parse role ARN history from localStorage:', error);
            return {
                roles: [],
                maxItems: this.maxItems
            };
        }
    }

    /**
     * Saves the role ARN history to localStorage
     * @param history - The history object to save
     */
    private saveHistory(history: RoleArnHistory): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save role ARN history to localStorage:', error);
            throw new Error('Failed to save role ARN history');
        }
    }

    /**
     * Adds a role ARN to the history
     * @param arn - The role ARN to add
     * @throws Error if ARN is invalid
     */
    addRoleArn(arn: string): void {
        if (!arn || typeof arn !== 'string') {
            throw new Error('Role ARN must be a non-empty string');
        }

        const trimmedArn = arn.trim();
        if (!this.isValidRoleArn(trimmedArn)) {
            throw new Error('Invalid AWS IAM Role ARN format');
        }

        const history = this.getHistory();
        const now = Date.now();

        // Check if role already exists
        const existingIndex = history.roles.findIndex(role => role.arn === trimmedArn);
        
        if (existingIndex >= 0) {
            // Update existing role
            const existingRole = history.roles[existingIndex];
            if (existingRole) {
                existingRole.lastUsed = now;
                existingRole.useCount += 1;
                
                // Move to front of array
                history.roles.splice(existingIndex, 1);
                history.roles.unshift(existingRole);
            }
        } else {
            // Add new role
            const newRole: RoleArnHistoryItem = {
                arn: trimmedArn,
                name: this.extractRoleName(trimmedArn),
                accountId: this.extractAccountId(trimmedArn),
                lastUsed: now,
                useCount: 1
            };

            history.roles.unshift(newRole);
        }

        // Trim to max items
        if (history.roles.length > this.maxItems) {
            history.roles = history.roles.slice(0, this.maxItems);
        }

        this.saveHistory(history);
    }

    /**
     * Gets all role ARNs from history
     * @returns Array of role ARN history items, sorted by last used (most recent first)
     */
    getRoleArns(): RoleArnHistoryItem[] {
        const history = this.getHistory();
        return [...history.roles].sort((a, b) => b.lastUsed - a.lastUsed);
    }

    /**
     * Gets the most recently used role ARN
     * @returns The most recent role ARN or null if no history
     */
    getMostRecentRoleArn(): string | null {
        const roles = this.getRoleArns();
        return roles.length > 0 && roles[0] ? roles[0].arn : null;
    }

    /**
     * Removes a role ARN from history
     * @param arn - The role ARN to remove
     */
    removeRoleArn(arn: string): void {
        if (!arn || typeof arn !== 'string') {
            return;
        }

        const history = this.getHistory();
        const filteredRoles = history.roles.filter(role => role.arn !== arn.trim());
        
        if (filteredRoles.length !== history.roles.length) {
            history.roles = filteredRoles;
            this.saveHistory(history);
        }
    }

    /**
     * Clears all role ARN history
     */
    clearHistory(): void {
        const emptyHistory: RoleArnHistory = {
            roles: [],
            maxItems: this.maxItems
        };
        this.saveHistory(emptyHistory);
    }

    /**
     * Gets role ARN history statistics
     * @returns Statistics about the role ARN history
     */
    getHistoryStats(): {
        totalRoles: number;
        mostUsedRole: RoleArnHistoryItem | null;
        oldestRole: RoleArnHistoryItem | null;
        newestRole: RoleArnHistoryItem | null;
    } {
        const roles = this.getRoleArns();
        
        if (roles.length === 0) {
            return {
                totalRoles: 0,
                mostUsedRole: null,
                oldestRole: null,
                newestRole: null
            };
        }

        const mostUsedRole = [...roles].sort((a, b) => b.useCount - a.useCount)[0] || null;
        const oldestRole = [...roles].sort((a, b) => a.lastUsed - b.lastUsed)[0] || null;
        const newestRole = roles[0] || null; // Already sorted by lastUsed desc

        return {
            totalRoles: roles.length,
            mostUsedRole,
            oldestRole,
            newestRole
        };
    }

    /**
     * Checks if a role ARN exists in history
     * @param arn - The role ARN to check
     * @returns True if exists, false otherwise
     */
    hasRoleArn(arn: string): boolean {
        if (!arn || typeof arn !== 'string') {
            return false;
        }

        const history = this.getHistory();
        return history.roles.some(role => role.arn === arn.trim());
    }

    /**
     * Gets a specific role from history by ARN
     * @param arn - The role ARN to find
     * @returns The role history item or null if not found
     */
    getRoleByArn(arn: string): RoleArnHistoryItem | null {
        if (!arn || typeof arn !== 'string') {
            return null;
        }

        const history = this.getHistory();
        return history.roles.find(role => role.arn === arn.trim()) || null;
    }

    /**
     * Exports role ARN history as JSON string
     * @returns JSON string of the history
     */
    exportHistory(): string {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Imports role ARN history from JSON string
     * @param jsonData - JSON string containing role ARN history
     * @throws Error if import fails
     */
    importHistory(jsonData: string): void {
        try {
            const imported = JSON.parse(jsonData) as RoleArnHistory;
            
            if (!imported.roles || !Array.isArray(imported.roles)) {
                throw new Error('Invalid history format: missing or invalid roles array');
            }

            // Validate each role
            for (const role of imported.roles) {
                if (!role.arn || !this.isValidRoleArn(role.arn)) {
                    throw new Error(`Invalid role ARN in import data: ${role.arn}`);
                }
            }

            // Merge with existing history, avoiding duplicates
            const currentHistory = this.getHistory();
            const mergedRoles = [...imported.roles];

            // Add current roles that aren't in the import
            for (const currentRole of currentHistory.roles) {
                if (!mergedRoles.some(r => r.arn === currentRole.arn)) {
                    mergedRoles.push(currentRole);
                }
            }

            // Sort by last used and trim to max items
            mergedRoles.sort((a, b) => b.lastUsed - a.lastUsed);
            const finalHistory: RoleArnHistory = {
                roles: mergedRoles.slice(0, this.maxItems),
                maxItems: this.maxItems
            };

            this.saveHistory(finalHistory);
        } catch (error) {
            console.error('Failed to import role ARN history:', error);
            throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Create and export singleton instance
export const roleArnStorage = new RoleArnStorageService();

// Export utility functions for direct use
export const roleArnUtils = {
    /**
     * Validates if a string is a valid AWS IAM Role ARN
     */
    isValidRoleArn: (arn: string): boolean => AWS_ROLE_ARN_PATTERN.test(arn),
    
    /**
     * Formats a role ARN for display
     */
    formatRoleArnForDisplay: (arn: string): string => {
        const parts = arn.split('/');
        const roleName = parts[parts.length - 1];
        const accountMatch = arn.match(/arn:aws:iam::(\d{12}):role\/.+$/);
        const accountId = accountMatch ? accountMatch[1] : 'Unknown';
        return `${roleName} (${accountId})`;
    },
    
    /**
     * Gets role name from ARN
     */
    getRoleNameFromArn: (arn: string): string => {
        const match = arn.match(/arn:aws:iam::\d{12}:role\/(.+)$/);
        return match && match[1] ? match[1] : 'Unknown';
    },
    
    /**
     * Gets account ID from ARN
     */
    getAccountIdFromArn: (arn: string): string => {
        const match = arn.match(/arn:aws:iam::(\d{12}):role\/.+$/);
        return match && match[1] ? match[1] : 'Unknown';
    }
};