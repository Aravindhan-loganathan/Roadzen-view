const API_URL = 'http://localhost:3000/api';

const getHeaders = () => {
    const token = localStorage.getItem('traffic_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

export interface SystemSettings {
    refresh_interval: string;
    ai_model: string;
    confidence_threshold: string;
}

export interface UserSettings {
    emergencyAlerts: boolean;
    systemAlerts: boolean;
    violationAlerts: boolean;
}

export const settingsService = {
    getSystemSettings: async (): Promise<SystemSettings> => {
        const response = await fetch(`${API_URL}/settings/system`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch system settings');
        return response.json();
    },

    updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<void> => {
        const response = await fetch(`${API_URL}/settings/system`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Failed to update system settings');
    },

    getUserSettings: async (): Promise<UserSettings> => {
        const response = await fetch(`${API_URL}/settings/user`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch user settings');
        return response.json();
    },

    updateUserSettings: async (settings: UserSettings): Promise<void> => {
        const response = await fetch(`${API_URL}/settings/user`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Failed to update user preferences');
    },

    changePassword: async (passwords: any): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(passwords),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }
    }
};
