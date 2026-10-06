/* ============================================================
   LOOXSHOP — Product Detail Page Script (Final v6)
   Description: Product display + professional reviews + admin reply (thread)
                + accurate review count + real-time sync
============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     1. STORAGE KEYS
  ------------------------------------------------------------ */
  const STORAGE_KEYS = {
    PRODUCTS: 'looxshop_products',
    WISHLIST: 'looxshop_wishlist',
    REVIEWS: 'looxshop_my_reviews',
    CURRENT_USER: 'looxshop_user'
  };

  const REVIEWS_SHOW_LIMIT = 3;

  /* ------------------------------------------------------------
     2. STATE
  ------------------------------------------------------------ */
  let currentShowAll = false;   // Are all reviews currently shown?
  let currentProductId = null;  // Current product ID

  /* ------------------------------------------------------------
     3. UTILITIES
  ------------------------------------------------------------ */
  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Write error', e);
    }
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function formatPrice(num) {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('fa-IR');
  }

  function toPersianDigits(v) {
    const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(v ?? '').replace(/\d/g, (d) => digits[d]);
  }

  function getUrlId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'p1';
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPersianDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) { return '—'; }
  }

  function getInitial(name) {
    return String(name || 'U').trim().charAt(0).toUpperCase();
  }

  /* ------------------------------------------------------------
     4. COUNT PRODUCT REVIEWS (accurate review count)
  ------------------------------------------------------------ */
  function countProductReviews(productId) {
    const all = readList(STORAGE_KEYS.REVIEWS);
    return all.filter((r) => String(r.productId) === String(productId)).length;
  }

  function getProductAverageRating(productId) {
    const all = readList(STORAGE_KEYS.REVIEWS);
    const productReviews = all.filter((r) => String(r.productId) === String(productId));
    if (productReviews.length === 0) return 0;
    const sum = productReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.round((sum / productReviews.length) * 10) / 10;
  }

  /* ------------------------------------------------------------
     5. PRODUCTS FALLBACK
  ------------------------------------------------------------ */
  const FALLBACK_PRODUCTS = [
    { id: 'p1', name: 'هدفون بی‌سیم لوکس', category: 'digital', price: 4850000, oldPrice: 5900000, stock: 25, image: 'assets/img/Wireless_headphones.jpg', rating: 4.8, reviewCount: 124, desc: 'هدفون بی‌سیم لوکس با فناوری نویز کنسلینگ فعال (ANC).' },
    { id: 'p2', name: 'ساعت هوشمند سری ۹', category: 'digital', price: 8200000, oldPrice: null, stock: 12, image: 'assets/img/Series_9_Smartwatch.jpg', rating: 4.9, reviewCount: 86, desc: 'ساعت هوشمند سری ۹ با نمایشگر همیشه‌روشن.' },
    { id: 'p3', name: 'عطر مردانه رویال', category: 'beauty', price: 2450000, oldPrice: null, stock: 40, image: "assets/img/Royal_men's_perfume.jpg", rating: 4.6, reviewCount: 54, desc: 'عطر مردانه رویال با رایحه چوبی-شرقی.' },
    { id: 'p4', name: 'کیف چرم دست‌دوز', category: 'accessories', price: 3150000, oldPrice: 3900000, stock: 8, image: 'assets/img/Leather_bag.jpg', rating: 4.7, reviewCount: 72, desc: 'کیف چرم دست‌دوز با چرم طبیعی گاوی.' },
    { id: 'p5', name: 'کاپشن زمستانی پرمیوم', category: 'clothing', price: 4300000, oldPrice: null, stock: 15, image: 'assets/img/Winter_jacket.jpg', rating: 4.5, reviewCount: 41, desc: 'کاپشن زمستانی پرمیوم با پارچه ضدآب.' },
    { id: 'p6', name: 'چراغ رومیزی مینیمال', category: 'home', price: 1850000, oldPrice: null, stock: 22, image: 'assets/img/Minimalist_tableLamp.jpg', rating: 4.4, reviewCount: 33, desc: 'چراغ رومیزی مینیمال با طراحی نوردیک.' },
    { id: 'p7', name: 'اسپیکر بلوتوثی پرتابل', category: 'digital', price: 3600000, oldPrice: null, stock: 3, image: 'assets/img/Bluetooth_speaker.jpg', rating: 4.7, reviewCount: 68, desc: 'اسپیکر بلوتوثی پرتابل با صدای استریو قوی.' },
    { id: 'p8', name: 'ست فنجان سرامیکی', category: 'home', price: 980000, oldPrice: 1150000, stock: 30, image: 'assets/img/Set_of_six_cups.jpg', rating: 4.3, reviewCount: 29, desc: 'ست ۴ عددی فنجان سرامیکی.' },
    { id: 'p9', name: 'گلدان دکوری سرامیک', category: 'home', price: 2750000, oldPrice: null, stock: 18, image: 'assets/img/Decorative_ceramic.jpg', rating: 4.6, reviewCount: 19, desc: 'گلدان دکوری سرامیک با طراحی مدرن.' },
    { id: 'p10', name: 'تی‌شرت نخی کلاسیک', category: 'clothing', price: 1250000, oldPrice: null, stock: 45, image: 'assets/img/Cotton_T-shirt.jpg', rating: 4.4, reviewCount: 24, desc: 'تی‌شرت نخی کلاسیک با پنبه ۱۰۰٪ مصری.' },
    { id: 'p11', name: 'سرم مرطوب‌کننده صورت', category: 'beauty', price: 1950000, oldPrice: 2600000, stock: 5, image: 'assets/img/Face_Serum.jpg', rating: 4.8, reviewCount: 92, desc: 'سرم مرطوب‌کننده صورت با هیالورونیک اسید.' },
    { id: 'p12', name: 'عینک آفتابی کلاسیک', category: 'accessories', price: 1550000, oldPrice: null, stock: 20, image: 'assets/img/Sunglasses.jpg', rating: 4.5, reviewCount: 37, desc: 'عینک آفتابی کلاسیک با فریم استات.' }
  ];

  const CATEGORY_LABELS = {
    digital: 'کالای دیجیتال',
    clothing: 'پوشاک',
    home: 'لوازم خانه',
    beauty: 'زیبایی و سلامت',
    accessories: 'اکسسوری'
  };

  /* ------------------------------------------------------------
     6. FIND PRODUCT
  ------------------------------------------------------------ */
  function findProduct(id) {
    const stored = readList(STORAGE_KEYS.PRODUCTS);
    if (stored.length > 0) {
      const found = stored.find((p) => String(p.id) === String(id));
      if (found) return normalizeProduct(found);
    }

    const fallback = FALLBACK_PRODUCTS.find((p) => String(p.id) === String(id));
    if (fallback) return normalizeProduct(fallback);

    if (/^\d+$/.test(id)) {
      const idx = parseInt(id, 10) - 1;
      if (stored[idx]) return normalizeProduct(stored[idx]);
      if (FALLBACK_PRODUCTS[idx]) return normalizeProduct(FALLBACK_PRODUCTS[idx]);
    }

    if (stored.length > 0) return normalizeProduct(stored[0]);
    return normalizeProduct(FALLBACK_PRODUCTS[0]);
  }

  function normalizeProduct(p) {
    const image = p.image || 'assets/img/hero.jpg';
    const price = Number(p.price) || 0;
    const oldPrice = p.oldPrice ? Number(p.oldPrice) : null;
    const discount = oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

    return {
      id: p.id,
      name: p.name || 'محصول بدون نام',
      category: CATEGORY_LABELS[p.category] || 'دسته‌بندی نشده',
      categorySlug: p.category || '',
      price: price,
      oldPrice: oldPrice,
      discount: discount,
      rating: Number(p.rating) || 4.5,
      stock: Number(p.stock) > 0,
      stockNumber: Number(p.stock) || 0,
      hasColors: false,
      images: [image, image, image, image],
      short: p.desc || `${p.name} — محصولی خاص از لوکس‌شاپ با کیفیت تضمین‌شده.`,
      description: p.desc || `${p.name} یکی از محصولات منتخب لوکس‌شاپ است.`,
      features: [
        'کیفیت ساخت بالا و ماندگار',
        'گارانتی اصالت و سلامت فیزیکی کالا',
        'ارسال سریع به سراسر کشور',
        'پشتیبانی ۷ روز هفته',
        'امکان مرجوعی تا ۷ روز'
      ],
      specs: {
        'نام محصول': p.name || '—',
        'دسته‌بندی': CATEGORY_LABELS[p.category] || '—',
        'موجودی': Number(p.stock) > 0 ? `${toPersianDigits(p.stock)} عدد` : 'ناموجود',
        'گارانتی': '۱۸ ماه گارانتی شرکتی',
        'ارسال از': 'انبار مرکزی لوکس‌شاپ'
      }
    };
  }

  /* ------------------------------------------------------------
     7. UPDATE REVIEW COUNT TAB
     ✅ The reviews tab always uses the actual number of reviews
  ------------------------------------------------------------ */
  function updateReviewsTabCount(productId) {
    const tabBtn = document.querySelector('.pd-tab[data-tab="reviews"]');
    if (!tabBtn) return;

    const count = countProductReviews(productId);
    tabBtn.textContent = `نظرات کاربران (${toPersianDigits(count)})`;
  }

  /* ------------------------------------------------------------
     8. POPULATE PRODUCT PAGE
  ------------------------------------------------------------ */
  function populatePage(product) {
    document.title = `${product.name} | خرید با ضمانت اصالت - لوکس‌شاپ`;

    const breadcrumbCurrent = document.querySelector('.breadcrumb__current');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    const mainImage = document.getElementById('pdMainImage');
    if (mainImage) {
      mainImage.src = product.images[0];
      mainImage.alt = product.name;
      mainImage.onerror = function () { this.src = 'assets/img/hero.jpg'; };
    }

    const thumbsWrap = document.querySelector('.pd-gallery__thumbs');
    if (thumbsWrap) {
      const uniqueImages = [...new Set(product.images)].filter(Boolean);
      if (uniqueImages.length <= 1) {
        thumbsWrap.style.display = 'none';
      } else {
        thumbsWrap.style.display = '';
        thumbsWrap.innerHTML = uniqueImages.map((src, i) => `
          <button class="pd-thumb${i === 0 ? ' is-active' : ''}" data-img="${escapeHtml(src)}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} - تصویر ${i + 1}"
                 onerror="this.parentElement.style.display='none'" />
          </button>
        `).join('');

        thumbsWrap.querySelectorAll('.pd-thumb').forEach((thumb) => {
          thumb.addEventListener('click', () => {
            if (mainImage) mainImage.src = thumb.dataset.img;
            thumbsWrap.querySelectorAll('.pd-thumb').forEach((t) => t.classList.remove('is-active'));
            thumb.classList.add('is-active');
          });
        });
      }
    }

    const badge = document.querySelector('.pd-gallery__main .badge');
    if (badge) {
      if (product.discount > 0) {
        badge.textContent = `${toPersianDigits(product.discount)}٪ تخفیف`;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    const cat = document.querySelector('.pd-info__cat');
    if (cat) cat.textContent = product.category;

    const title = document.querySelector('.pd-info__title');
    if (title) title.textContent = product.name;

    const ratingWrap = document.querySelector('.pd-info__rating');
    if (ratingWrap) {
      const strong = ratingWrap.querySelector('strong');
      const small = ratingWrap.querySelector('small');
      if (strong) strong.textContent = product.rating.toLocaleString('fa-IR');
      if (small) small.textContent = '';
    }

    const stock = document.querySelector('.pd-info__stock');
    if (stock) {
      if (product.stock) {
        stock.textContent = `✅ موجود در انبار (${toPersianDigits(product.stockNumber)} عدد)`;
        stock.style.color = '#2e7d32';
      } else {
        stock.textContent = '❌ ناموجود';
        stock.style.color = '#c62828';
      }
    }

    const short = document.querySelector('.pd-info__short');
    if (short) short.textContent = product.short;

    const priceBox = document.querySelector('.pd-price');
    if (priceBox) {
      if (product.oldPrice && product.discount > 0) {
        priceBox.innerHTML = `
          <div class="pd-price__row">
            <del class="pd-price__old">${formatPrice(product.oldPrice)} تومان</del>
            <span class="pd-price__discount">${toPersianDigits(product.discount)}٪ تخفیف</span>
          </div>
          <div class="pd-price__new">
            <strong>${formatPrice(product.price)}</strong>
            <span>تومان</span>
          </div>`;
      } else {
        priceBox.innerHTML = `
          <div class="pd-price__new">
            <strong>${formatPrice(product.price)}</strong>
            <span>تومان</span>
          </div>`;
      }
    }

    const colorsBox = document.querySelector('.pd-options');
    if (colorsBox) colorsBox.style.display = product.hasColors ? '' : 'none';

    const addBtn = document.getElementById('pdAddToCart');
    if (addBtn) {
      addBtn.dataset.id = product.id;
      addBtn.dataset.name = product.name;
      addBtn.dataset.price = product.price;
      addBtn.dataset.image = product.images[0];

      if (!product.stock) {
        addBtn.disabled = true;
        addBtn.textContent = 'ناموجود';
        addBtn.style.opacity = '.5';
        addBtn.style.cursor = 'not-allowed';
      }
    }

    const descPanel = document.querySelector('.pd-panel[data-panel="desc"]');
    if (descPanel) {
      const features = product.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
      descPanel.innerHTML = `
        <h2>درباره ${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
        <h3>ویژگی‌های برجسته:</h3>
        <ul class="pd-list">${features}</ul>`;
    }

    const specsPanel = document.querySelector('.pd-panel[data-panel="specs"]');
    if (specsPanel) {
      const rows = Object.entries(product.specs)
        .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
        .join('');
      specsPanel.innerHTML = `
        <h2>مشخصات فنی</h2>
        <table class="pd-specs"><tbody>${rows}</tbody></table>`;
    }

    // ✅ Update the reviews tab based on the actual count
    updateReviewsTabCount(product.id);

    // ✅ Update the rating based on actual reviews (if any reviews exist)
    const actualAvg = getProductAverageRating(product.id);
    const reviewScore = document.querySelector('.pd-review-score strong');
    const reviewSmall = document.querySelector('.pd-review-score small');
    const reviewCount = countProductReviews(product.id);

    if (reviewScore && actualAvg > 0) {
      reviewScore.textContent = actualAvg.toLocaleString('fa-IR');
    } else if (reviewScore) {
      reviewScore.textContent = product.rating.toLocaleString('fa-IR');
    }

    if (reviewSmall) {
      reviewSmall.textContent = `از ${toPersianDigits(reviewCount)} نظر`;
    }
  }

  /* ------------------------------------------------------------
     9. RENDER REVIEWS
  ------------------------------------------------------------ */
  function renderReviews(productId, showAll = false) {
    const wrap = document.getElementById('pdReviewsList');
    if (!wrap) return;

    currentShowAll = showAll;

    const allReviews = readList(STORAGE_KEYS.REVIEWS);
    const productReviews = allReviews
      .filter((r) => String(r.productId) === String(productId))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (productReviews.length === 0) {
      wrap.innerHTML = `
        <div class="pd-no-reviews">
          <div class="pd-no-reviews__icon">💬</div>
          <p>هنوز نظری برای این محصول ثبت نشده است.</p>
          <p class="pd-no-reviews__sub">اولین نفری باشید که نظرتان را ثبت می‌کنید!</p>
        </div>`;
      return;
    }

    const reviewsToShow = showAll
      ? productReviews
      : productReviews.slice(0, REVIEWS_SHOW_LIMIT);

    const reviewsHtml = reviewsToShow.map((r) => renderSingleReview(r)).join('');

    const remaining = productReviews.length - REVIEWS_SHOW_LIMIT;
    const showAllBtnHtml = (!showAll && remaining > 0)
      ? `<button type="button" class="pd-show-all-reviews" id="pdShowAllReviews">
           مشاهده همه نظرات (${toPersianDigits(productReviews.length)} نظر)
           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <polyline points="6 9 12 15 18 9"></polyline>
           </svg>
         </button>`
      : '';

    const hideAllBtnHtml = (showAll && productReviews.length > REVIEWS_SHOW_LIMIT)
      ? `<button type="button" class="pd-show-all-reviews pd-show-all-reviews--less" id="pdHideAllReviews">
           نمایش کمتر
           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <polyline points="18 15 12 9 6 15"></polyline>
           </svg>
         </button>`
      : '';

    wrap.innerHTML = reviewsHtml + showAllBtnHtml + hideAllBtnHtml;

    document.getElementById('pdShowAllReviews')?.addEventListener('click', () => {
      renderReviews(productId, true);
    });
    document.getElementById('pdHideAllReviews')?.addEventListener('click', () => {
      renderReviews(productId, false);
    });
  }

  function renderSingleReview(r) {
    const initial = getInitial(r.userName);
    const replies = Array.isArray(r.replies) ? r.replies : [];

    const repliesHtml = replies.length > 0
      ? `<div class="pd-review__replies">
           ${replies.map((rep) => {
        const isAdmin = rep.from === 'admin';
        return `
               <div class="pd-review__reply ${isAdmin ? 'pd-review__reply--admin' : ''}">
                 <div class="pd-review__reply-head">
                   <span class="pd-review__reply-avatar">${isAdmin ? '🛡️' : getInitial(rep.userName || r.userName)}</span>
                   <div class="pd-review__reply-info">
                     <strong>${isAdmin ? 'پشتیبانی لوکس‌شاپ' : escapeHtml(rep.userName || r.userName || 'کاربر')}</strong>
                     <small>${formatPersianDate(rep.date)}</small>
                   </div>
                   ${isAdmin ? '<span class="pd-review__reply-badge">پاسخ رسمی</span>' : ''}
                 </div>
                 <p class="pd-review__reply-text">${escapeHtml(rep.text || '')}</p>
               </div>
             `;
      }).join('')}
         </div>`
      : '';

    return `
      <div class="pd-review" data-review-id="${escapeHtml(r.id)}">
        <div class="pd-review__head">
          <div class="pd-review__user">
            <div class="pd-review__avatar">${escapeHtml(initial)}</div>
            <div class="pd-review__user-info">
              <strong>${escapeHtml(r.userName || 'کاربر مهمان')}</strong>
              <small>${formatPersianDate(r.date)}</small>
            </div>
          </div>
          <div class="pd-review__stars">
            ${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}
          </div>
        </div>
        <p class="pd-review__text">${escapeHtml(r.text || '')}</p>
        ${repliesHtml}
      </div>
    `;
  }

  /* ------------------------------------------------------------
     10. REVIEW FORM
  ------------------------------------------------------------ */
  function renderReviewForm() {
    const wrap = document.getElementById('pdReviewForm');
    if (!wrap) return;

    const currentUser = getCurrentUser();

    if (!currentUser) {
      wrap.innerHTML = `
        <div class="pd-login-required">
          <div class="pd-login-required__icon">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3>برای ثبت نظر ابتدا وارد شوید</h3>
          <p>برای اینکه بتوانید نظر خود را ثبت کنید، لطفاً وارد حساب کاربری خود شوید یا ثبت‌نام کنید.</p>
          <div class="pd-login-required__actions">
            <a href="login.html" class="btn btn--primary" id="pdLoginLink">ورود به حساب</a>
            <a href="register.html" class="btn btn--outline">ثبت‌نام سریع</a>
          </div>
        </div>
      `;

      document.getElementById('pdLoginLink')?.addEventListener('click', () => {
        sessionStorage.setItem('looxshop_redirect', window.location.href);
      });

      return;
    }

    wrap.innerHTML = `
      <div class="pd-review-form-box">
        <div class="pd-review-form-box__head">
          <h3>نظر خود را بنویسید</h3>
          <p>تجربه خود را با دیگران به اشتراک بگذارید</p>
        </div>

        <form id="pdReviewInnerForm">
          <div class="pd-review-form__row">
            <div class="form-field">
              <label for="pdReviewerName">نام و نام خانوادگی</label>
              <input type="text" id="pdReviewerName"
                value="${escapeHtml(currentUser.name || '')}"
                placeholder="مثلاً علی رضایی" required />
            </div>
            <div class="form-field">
              <label for="pdReviewerEmail">ایمیل</label>
              <input type="email" id="pdReviewerEmail"
                value="${escapeHtml(currentUser.email || '')}"
                placeholder="example@email.com" dir="ltr" required />
            </div>
          </div>

          <div class="pd-review-form__rating-row">
            <label>امتیاز شما به این محصول <span style="color:#c62828">*</span></label>
            <div class="pd-stars-input" id="pdStarsInput" data-rating="0">
              <button type="button" data-star="1" aria-label="۱ ستاره">★</button>
              <button type="button" data-star="2" aria-label="۲ ستاره">★</button>
              <button type="button" data-star="3" aria-label="۳ ستاره">★</button>
              <button type="button" data-star="4" aria-label="۴ ستاره">★</button>
              <button type="button" data-star="5" aria-label="۵ ستاره">★</button>
            </div>
            <small class="pd-rating-hint" id="pdRatingHint">برای ثبت نظر، ابتدا امتیاز بدهید</small>
          </div>

          <div class="form-field">
            <label for="pdReviewText">متن نظر <span style="color:#c62828">*</span></label>
            <textarea id="pdReviewText" rows="5"
              placeholder="تجربه خود از این محصول را بنویسید..." required></textarea>
          </div>

          <div class="pd-review-form__actions">
            <button type="submit" class="btn btn--primary" id="pdReviewSubmitBtn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              ارسال نظر
            </button>
          </div>
        </form>
      </div>
    `;

    initStarRating();
    initReviewFormSubmit(currentUser);
  }

  function initStarRating() {
    const starsWrap = document.getElementById('pdStarsInput');
    if (!starsWrap) return;

    const buttons = starsWrap.querySelectorAll('button');
    let selectedRating = 0;

    function updateStars(value) {
      buttons.forEach((b) => {
        b.classList.toggle('is-active', Number(b.dataset.star) <= value);
      });
    }

    buttons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        updateStars(Number(btn.dataset.star));
      });

      btn.addEventListener('click', () => {
        selectedRating = Number(btn.dataset.star);
        starsWrap.dataset.rating = String(selectedRating);
        updateStars(selectedRating);

        const hint = document.getElementById('pdRatingHint');
        if (hint) {
          hint.textContent = `امتیاز شما: ${toPersianDigits(selectedRating)} از ۵`;
          hint.classList.add('is-ok');
        }
      });
    });

    starsWrap.addEventListener('mouseleave', () => {
      updateStars(selectedRating);
    });
  }

  function initReviewFormSubmit(currentUser) {
    const form = document.getElementById('pdReviewInnerForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const liveUser = getCurrentUser();
      if (!liveUser) {
        showToast('لطفاً ابتدا وارد حساب کاربری خود شوید');
        setTimeout(() => {
          sessionStorage.setItem('looxshop_redirect', window.location.href);
          window.location.href = 'login.html';
        }, 1000);
        return;
      }

      const name = document.getElementById('pdReviewerName').value.trim();
      const email = document.getElementById('pdReviewerEmail').value.trim().toLowerCase();
      const text = document.getElementById('pdReviewText').value.trim();
      const starsWrap = document.getElementById('pdStarsInput');
      const rating = Number(starsWrap?.dataset.rating || 0);

      if (!name || name.length < 3) {
        showToast('لطفاً نام و نام خانوادگی خود را کامل وارد کنید');
        document.getElementById('pdReviewerName')?.focus();
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('لطفاً ایمیل معتبر وارد کنید');
        document.getElementById('pdReviewerEmail')?.focus();
        return;
      }

      if (rating === 0) {
        showToast('لطفاً ابتدا امتیاز خود را انتخاب کنید ⭐');
        starsWrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (!text || text.length < 5) {
        showToast('لطفاً متن نظر خود را بنویسید (حداقل ۵ کاراکتر)');
        document.getElementById('pdReviewText')?.focus();
        return;
      }

      const urlId = getUrlId();
      const product = findProduct(urlId);

      const reviews = readList(STORAGE_KEYS.REVIEWS);
      reviews.unshift({
        id: 'RV' + Date.now(),
        productId: urlId,
        product: product.name,
        productImage: product.images[0],
        rating: rating,
        text: text,
        userId: liveUser.id || null,
        userEmail: email,
        userName: name,
        replies: [],
        date: new Date().toISOString()
      });
      writeList(STORAGE_KEYS.REVIEWS, reviews);

      if (window.LooxSync) window.LooxSync.notify(STORAGE_KEYS.REVIEWS);

      // ✅ Re-render reviews in the current state
      renderReviews(urlId, currentShowAll);
      renderReviewForm();

      // ✅ Update the reviews tab
      updateReviewsTabCount(urlId);

      // ✅ Update the rating
      const newAvg = getProductAverageRating(urlId);
      const reviewScore = document.querySelector('.pd-review-score strong');
      const reviewSmall = document.querySelector('.pd-review-score small');
      if (reviewScore) reviewScore.textContent = newAvg.toLocaleString('fa-IR');
      if (reviewSmall) {
        reviewSmall.textContent = `از ${toPersianDigits(countProductReviews(urlId))} نظر`;
      }

      showToast('نظر شما با موفقیت ثبت شد. ممنون از همراهی‌تون ✓');
    });
  }

  /* ------------------------------------------------------------
     11. TOAST
  ------------------------------------------------------------ */
  function showToast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  /* ------------------------------------------------------------
     12. INIT
  ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    currentProductId = getUrlId();
    const product = findProduct(currentProductId);
    populatePage(product);

    const favBtn = document.querySelector('.pd-fav-btn');
    if (favBtn) {
      const wishlist = readList(STORAGE_KEYS.WISHLIST);
      if (wishlist.some((w) => String(w.id) === String(currentProductId))) {
        favBtn.classList.add('is-active');
      }
    }

    renderReviews(currentProductId, false);
    renderReviewForm();

    // ============================================================
    // ✅ REAL-TIME SYNC — admin reply appears instantly
    // ============================================================
    if (window.LooxSync) {
      window.LooxSync.on(STORAGE_KEYS.REVIEWS, () => {
        if (!currentProductId) return;
        renderReviews(currentProductId, currentShowAll);
        updateReviewsTabCount(currentProductId);

        // Update rating
        const newAvg = getProductAverageRating(currentProductId);
        const reviewScore = document.querySelector('.pd-review-score strong');
        const reviewSmall = document.querySelector('.pd-review-score small');
        if (reviewScore && newAvg > 0) reviewScore.textContent = newAvg.toLocaleString('fa-IR');
        if (reviewSmall) {
          reviewSmall.textContent = `از ${toPersianDigits(countProductReviews(currentProductId))} نظر`;
        }
      });
    }
  });

  /* ------------------------------------------------------------
     13. QUANTITY
  ------------------------------------------------------------ */
  const qtyInput = document.getElementById('pdQty');
  const btnMinus = document.getElementById('pdMinus');
  const btnPlus = document.getElementById('pdPlus');

  function clampQty(value) {
    let v = Number(value) || 1;
    if (v < 1) v = 1;
    if (v > 10) v = 10;
    return v;
  }

  btnMinus?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = clampQty(Number(qtyInput.value) - 1);
  });
  btnPlus?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = clampQty(Number(qtyInput.value) + 1);
  });
  qtyInput?.addEventListener('change', () => {
    qtyInput.value = clampQty(qtyInput.value);
  });

  /* ------------------------------------------------------------
     14. COLOR
  ------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const color = e.target.closest('.pd-color');
    if (!color) return;
    document.querySelectorAll('.pd-color').forEach((c) => c.classList.remove('is-active'));
    color.classList.add('is-active');
  });

  /* ------------------------------------------------------------
     15. WISHLIST TOGGLE
  ------------------------------------------------------------ */
  /* ------------------------------------------------------------
   15. WISHLIST TOGGLE (with login check)
------------------------------------------------------------ */
  const favBtn = document.querySelector('.pd-fav-btn');
  favBtn?.addEventListener('click', () => {
    const urlId = getUrlId();
    const product = findProduct(urlId);

    // ✅ Check login
    const currentUser = getCurrentUser();
    if (!currentUser) {
      showToast('برای افزودن به علاقه‌مندی‌ها ابتدا وارد شوید');
      sessionStorage.setItem('looxshop_redirect', window.location.href);
      setTimeout(() => window.location.href = 'login.html', 1400);
      return;
    }

    const isActive = favBtn.classList.toggle('is-active');

    if (isActive) {
      const list = readList(STORAGE_KEYS.WISHLIST);
      if (!list.some((w) => String(w.id) === String(urlId))) {
        list.push({
          id: urlId,
          name: product.name,
          price: product.price,
          image: product.images[0]
        });
        writeList(STORAGE_KEYS.WISHLIST, list);
      }
      showToast('به علاقه‌مندی‌ها اضافه شد ♥');
    } else {
      const list = readList(STORAGE_KEYS.WISHLIST).filter((w) => String(w.id) !== String(urlId));
      writeList(STORAGE_KEYS.WISHLIST, list);
      showToast('از علاقه‌مندی‌ها حذف شد');
    }

    // ✅ Notify dashboard
    if (window.LooxSync) window.LooxSync.notify(STORAGE_KEYS.WISHLIST);
  });

  /* ------------------------------------------------------------
     16. ADD TO CART
  ------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#pdAddToCart');
    if (!addBtn) return;
    if (addBtn.disabled) return;

    const qty = qtyInput ? Number(qtyInput.value) : 1;

    if (typeof addToCart === 'function') {
      for (let i = 0; i < qty; i += 1) {
        addToCart({
          id: addBtn.dataset.id,
          name: addBtn.dataset.name,
          price: Number(addBtn.dataset.price),
          image: addBtn.dataset.image,
        });
      }
      if (qtyInput) qtyInput.value = 1;
      showToast(`${toPersianDigits(qty)} عدد به سبد خرید اضافه شد ✓`);

      if (window.LooxSync) window.LooxSync.notify('looxshop_cart');
    } else {
      showToast('خطا: تابع سبد خرید پیدا نشد');
    }
  });

  /* ------------------------------------------------------------
     17. TABS
  ------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.pd-tab');
    if (!tab) return;

    const target = tab.dataset.tab;
    document.querySelectorAll('.pd-tab').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');

    document.querySelectorAll('.pd-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === target);
    });
  });

})();
