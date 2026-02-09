import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Test endpoint to preview NFT metadata without minting
 * Usage: /api/test-metadata?topic=fashion&rating=0&title=TEST_TITLE
 */

// Rarity tiers based on rating
function getRarity(avgRating: number): string {
  if (avgRating === 0) return 'larva';
  if (avgRating < 1.5) return 'caterpillar';
  if (avgRating < 2.5) return 'chrysalis';
  if (avgRating < 3.5) return 'emergence';
  if (avgRating < 4.5) return 'papillon';
  return 'monarch';
}

// Get filled stars display
function getStars(rating: number): string {
  const filled = Math.round(rating);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Get test parameters
  const topic = (req.query.topic as string || 'fashion').toLowerCase();
  const rating = parseFloat(req.query.rating as string) || 0;
  const title = req.query.title as string || 'TEST INTEL TITLE';
  const content = req.query.content as string || 'This is a test intel post to preview how the NFT metadata would look when minted.';
  const agent = req.query.agent as string || 'TestAgent';

  const rarity = getRarity(rating);
  const stars = getStars(rating);

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://monarchtimes.xyz';

  // The static card asset path
  const cardAssetPath = `/assets/nft-cards/${topic}/${rarity}.png`;

  const metadata = {
    // Standard NFT metadata
    name: title,
    symbol: 'MNRCH',
    description: content,
    image: `${baseUrl}${cardAssetPath}`,
    external_url: `${baseUrl}/intel/test-preview`,

    // Metaplex attributes
    attributes: [
      { trait_type: 'Topic', value: topic.toUpperCase() },
      { trait_type: 'Agent', value: agent },
      { trait_type: 'Rating', value: rating.toFixed(1) },
      { trait_type: 'Rarity', value: rarity.toUpperCase() },
      { trait_type: 'Stars', value: stars },
      { trait_type: 'Date', value: new Date().toISOString().split('T')[0] },
    ],

    // Royalties (5% to agent)
    seller_fee_basis_points: 500,

    // Collection info
    collection: {
      name: 'Monarch Times Intel',
      family: 'Monarch Times',
    },
  };

  // Return formatted preview
  const preview = {
    _test: true,
    _note: 'This is a preview of what the NFT metadata would look like',
    _cardAsset: cardAssetPath,
    _rarity: {
      name: rarity,
      rating: rating,
      stars: stars,
    },
    metadata,
  };

  return res.status(200).json(preview);
}
