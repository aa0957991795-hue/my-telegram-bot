import { useEffect, useState } from 'react';
import { api, FILES_URL } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SponsoredBannerCard() {
  const { user } = useAuth();
  const [banners, setBanners] = useState([]);

  // Check if ads feature flag is enabled
  const isAdsEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';

  useEffect(() => {
    // If ads are disabled by environment flag, don't fetch or render anything
    if (!isAdsEnabled) return;

    api.get('/banners', { params: { cityId: user?.cityId } })
      .then((res) => setBanners(res.data || []))
      .catch(() => setBanners([]));
  }, [user?.cityId, isAdsEnabled]);

  if (!isAdsEnabled || banners.length === 0) {
    return null;
  }

  const banner = banners[0];

  return (
    <a
      href={banner.targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ticket-card p-3 flex flex-col gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between text-[10px] text-amber-700 font-bold uppercase tracking-wider">
        <span>📢 Реклама / Партнер</span>
        <span className="group-hover:translate-x-0.5 transition-transform">Перейти →</span>
      </div>

      {banner.imageUrl && (
        <img
          src={`${FILES_URL}${banner.imageUrl}`}
          alt={banner.title}
          className="w-full max-h-32 object-cover rounded-xl border border-amber-200/50"
        />
      )}

      <div>
        <h4 className="font-bold text-sm text-ink group-hover:text-amber-900 transition-colors">
          {banner.title}
        </h4>
        {banner.description && (
          <p className="text-xs text-ink/60 mt-0.5 line-clamp-2">
            {banner.description}
          </p>
        )}
      </div>
    </a>
  );
}