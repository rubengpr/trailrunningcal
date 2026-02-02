export async function updateOrganizer(data: { organizationName: string, organizationWebsite: string, facebookUrl: string, instagramUrl: string, youtubeUrl: string, tiktokUrl: string }) {
    const response = await fetch('/api/organizers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const responseData = await response.json()

    if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update organizer');
    }

    return responseData;
}