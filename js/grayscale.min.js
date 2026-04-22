(function($) {
  "use strict"; // Start of use strict

  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 70)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#mainNav',
    offset: 100
  });

  // Collapse Navbar
  var navbarCollapse = function() {
    if ($("#mainNav").offset().top > 100) {
      $("#mainNav").addClass("navbar-shrink");
    } else {
      $("#mainNav").removeClass("navbar-shrink");
    }
  };
  // Collapse now if page is not at top
  navbarCollapse();
  // Collapse the navbar when page is scrolled
  $(window).scroll(navbarCollapse);

})(jQuery); // End of use strict

// Animated bird on hero masthead
(function () {
  var masthead = document.querySelector('.masthead');
  if (!masthead) return;

  var W = 90, H = 39;
  var NS = 'http://www.w3.org/2000/svg';

  /* ── real seagull silhouette (original path, gray fill) ── */
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1634.0625 702.1875');
  svg.setAttribute('width',  W);
  svg.setAttribute('height', H);
  svg.setAttribute('class', 'b-gull');
  svg.style.cssText = 'position:absolute;left:-200px;top:-200px;z-index:20;cursor:pointer;' +
    'pointer-events:all;filter:brightness(1.5) blur(0.6px) drop-shadow(0 1px 5px rgba(0,0,0,.18));' +
    'transform-origin:' + (W/2) + 'px ' + (H/2) + 'px';
  /* path wrapped in a flip group so direction changes don't fight the bank animation */
  svg.innerHTML =
    '<defs>' +
      /* radial gradient: lighter wings fading to medium-dark body, matches reference photo */
      '<radialGradient id="gg" gradientUnits="userSpaceOnUse" cx="817" cy="400" r="740">' +
        '<stop offset="0%"   stop-color="#454545"/>' +
        '<stop offset="35%"  stop-color="#757575"/>' +
        '<stop offset="70%"  stop-color="#6a6a6a"/>' +
        '<stop offset="100%" stop-color="#545454"/>' +
      '</radialGradient>' +
      '<filter id="gf" color-interpolation-filters="sRGB" x="-4%" y="-8%" width="108%" height="116%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.022 0.018" numOctaves="4" seed="8" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
    '</defs>' +
    '<g class="b-flip" filter="url(#gf)"><g class="b-wing">' +
    '<path fill="url(#gg)" d="m 810.9375,701.82592 c 0,-0.19888 0.63022,-1.56997 1.40048,-3.04688 0.77025,-1.47691 1.40307,-3.37191 1.40625,-4.21113 0.003,-0.8392 0.63858,-2.05101 1.41202,-2.69291 0.77344,-0.6419 1.40625,-1.93933 1.40625,-2.88318 0,-2.56026 2.01387,-6.49182 3.32533,-6.49182 0.63215,0 1.35994,-1.16016 1.61731,-2.57812 0.25738,-1.41797 1.03773,-3.96821 1.73411,-5.66718 2.08005,-5.07473 -1.72047,-6.56252 -6.49695,-2.54337 l -2.77656,2.33631 -0.44295,-2.31718 c -0.31316,-1.63813 0.34225,-3.19668 2.23651,-5.31838 1.4737,-1.65066 3.1858,-4.40146 3.80466,-6.11289 0.61887,-1.71143 1.62475,-3.11169 2.2353,-3.11169 0.61055,0 1.80116,-1.05469 2.64578,-2.34375 0.84463,-1.28906 2.07094,-2.34375 2.72513,-2.34375 0.65419,0 2.96478,-1.80893 5.13463,-4.01986 6.66568,-6.79182 4.628,-8.518 -3.5548,-3.01139 -4.35181,2.92855 -5.546,3.28212 -11.10983,3.2894 -15.77688,0.0206 -20.18608,2.8161 -25.8599,16.39547 -0.8466,2.02621 -2.10025,4.33226 -2.78588,5.12457 -0.68563,0.79231 -2.83237,4.45579 -4.77054,8.14108 -2.93436,5.57945 -5.9707,8.76823 -8.34909,8.76823 -0.15787,0 -0.0844,-2.10937 0.16338,-4.6875 0.43146,-4.49019 0.35219,-4.6875 -1.88319,-4.6875 -2.83442,0 -5.1461,-8.40547 -3.50138,-12.73139 1.71042,-4.49875 1.19851,-7.26819 -1.20045,-6.49447 -2.75669,0.8891 -10.03351,0.62664 -13.97612,-0.50409 -1.71648,-0.49227 -5.34422,-0.89505 -8.06166,-0.89505 -2.71743,0 -5.71081,-0.48089 -6.65196,-1.06865 -1.11729,-0.69776 -2.25764,-0.76283 -3.28571,-0.18749 -2.22967,1.24779 -13.21766,-0.0691 -16.04743,-1.92318 -2.81304,-1.84318 -3.09133,-5.38745 -0.97163,-12.37481 1.79905,-5.93041 1.87566,-12.57087 0.14504,-12.57087 -1.02517,0 -1.09086,-0.91288 -0.33924,-4.71424 1.37068,-6.93226 -0.49798,-6.93643 -20.2629,-0.0452 -9.80028,3.41691 -15.62651,4.53704 -15.62651,3.00424 0,-0.58153 -0.96082,-1.05732 -2.13515,-1.05732 -2.22169,0 -6.03121,-2.21964 -7.79035,-4.5391 -0.56059,-0.73915 -1.61106,-1.14663 -2.33438,-0.90552 C 670.29358,621.41256 660,616.17075 660,614.63599 c 0,-0.68713 -1.05469,-2.80351 -2.34375,-4.70305 -1.4353,-2.11503 -2.35312,-4.80024 -2.36794,-6.9277 -0.0216,-3.09658 -0.40349,-3.64357 -3.51562,-5.03493 -1.92029,-0.85852 -7.75471,-3.49524 -12.96537,-5.85937 -5.21067,-2.36414 -9.95676,-4.29844 -10.54688,-4.29844 -0.63817,0 -1.07294,-1.62309 -1.07294,-4.00556 0,-3.68233 -0.28369,-4.1514 -3.51563,-5.81294 -5.5315,-2.84374 -6.5808,-4.01417 -6.05669,-6.75589 0.44489,-2.32722 0.3066,-2.43184 -2.47825,-1.87487 -1.62218,0.32443 -2.94943,0.24113 -2.94943,-0.18514 0,-1.17114 -4.80295,-5.9185 -8.58608,-8.4867 -3.45511,-2.34552 -4.53892,-6.95291 -4.53892,-19.29546 0,-2.13984 -0.92978,-3.99453 -3.21974,-6.42259 -11.95549,-12.6765 -13.21373,-17.01442 -6.19981,-21.37451 5.28661,-3.28633 6.08274,-5.83587 2.76107,-8.84195 -9.10968,-8.24415 -2.60522,-11.65777 25.7201,-13.49824 59.28774,-3.85228 81.42252,-5.60003 94.84463,-7.48893 6.70312,-0.94333 14.71875,-2.00916 17.8125,-2.36852 3.09375,-0.35938 6.26699,-0.9959 7.05165,-1.41451 0.78465,-0.41862 8.80028,-1.86934 17.8125,-3.22382 9.01222,-1.35449 17.44054,-2.85973 18.7296,-3.34498 1.28906,-0.48525 6.35156,-1.35602 11.25,-1.93504 9.55834,-1.12986 14.01228,-2.80705 14.7286,-5.54627 0.24671,-0.94341 1.35792,-1.95253 2.46935,-2.2425 7.69484,-2.00754 12.84253,-15.12969 6.28883,-16.03105 -2.94702,-0.40532 -5.52838,-1.4629 -7.07955,-2.90048 -1.34273,-1.2444 -2.7728,-2.26255 -3.17794,-2.26255 -4.06096,0 -10.41679,-10.43555 -10.41679,-17.10319 0,-1.93699 -0.42188,-3.52181 -0.9375,-3.52181 -0.51563,0 -0.9375,-0.53359 -0.9375,-1.18576 0,-0.65216 -0.90289,-2.86701 -2.00643,-4.92187 -1.10353,-2.05486 -2.96431,-6.37265 -4.13506,-9.59507 -1.17075,-3.22243 -3.22098,-7.15714 -4.55607,-8.74381 -1.33509,-1.58666 -2.42744,-3.21275 -2.42744,-3.61352 0,-2.15164 -4.81177,-5.68997 -7.73776,-5.68997 -3.43921,0 -7.70895,-3.84145 -13.77605,-12.3942 -2.44132,-3.44152 -3.92235,-4.58794 -6.66123,-5.15625 -2.85703,-0.59284 -4.62425,-2.05823 -9.36076,-7.76205 -4.74558,-5.71474 -6.56148,-7.21882 -9.69839,-8.03302 -3.34347,-0.86781 -4.52542,-1.96471 -8.83915,-8.20312 -4.78152,-6.91493 -5.12645,-7.20136 -8.67187,-7.20136 -2.03076,0 -3.69229,-0.3495 -3.69229,-0.77667 0,-4.13141 -9.01256,-14.23503 -13.19243,-14.78951 -4.2157,-0.55923 -4.69256,-0.92574 -8.52712,-6.5538 -3.35703,-4.92719 -4.63097,-6.06481 -7.34295,-6.55721 -4.98443,-0.905 -6.70821,-2.38292 -10.65653,-9.13661 -4.2088,-7.19925 -4.69319,-7.65932 -8.90619,-8.45902 -3.24587,-0.61611 -6.90435,-3.98923 -10.83616,-9.99094 -2.97958,-4.54819 -4.09919,-5.27946 -9.21716,-6.02017 -3.63792,-0.52651 -4.93367,-1.26471 -7.03125,-4.00582 C 622.99957,264.86467 620.4248,262.5 617.76444,262.5 c -5.35857,0 -7.74821,-1.62694 -14.33022,-9.75644 -5.71119,-7.05396 -5.81958,-7.11856 -11.94293,-7.11856 -5.59692,0 -11.32659,-3.09728 -18.41955,-9.95704 -2.38122,-2.30294 -7.41625,-4.83717 -10.80982,-5.44081 -1.93563,-0.3443 -4.25594,-1.41436 -5.15625,-2.3779 -3.92649,-4.2023 -9.07324,-7.53675 -11.633,-7.53675 -7.57697,0 -24.26199,-8.84344 -29.40377,-15.58466 -2.20991,-2.89734 -2.9387,-3.27576 -5.37163,-2.78917 -2.2364,0.44728 -3.72155,-0.0885 -7.2274,-2.60717 -2.42692,-1.74356 -5.43095,-3.49224 -6.6756,-3.88593 -1.24466,-0.39371 -4.88645,-2.30825 -8.09286,-4.25455 -3.20641,-1.94629 -8.69079,-4.65251 -12.1875,-6.01383 -3.49671,-1.3613 -8.3343,-3.29401 -10.7502,-4.2949 -2.4159,-1.00088 -5.1083,-1.81979 -5.9831,-1.81979 -2.25888,0 -7.90561,-3.66593 -7.90561,-5.13241 0,-1.55769 -2.09497,-2.36759 -6.12428,-2.36759 -4.16567,0 -10.9808,-1.43939 -22.64169,-4.78207 -5.25096,-1.50522 -11.57909,-2.97697 -14.0625,-3.27056 -5.35566,-0.63314 -8.73403,-2.10559 -8.73403,-3.80668 0,-0.67648 -1.16016,-1.49299 -2.57813,-1.81446 -1.41796,-0.32147 -4.89843,-1.13414 -7.73437,-1.80591 -2.83594,-0.67178 -7.89844,-1.69492 -11.25,-2.27365 -19.06231,-3.2916 -36.95524,-8.94509 -37.81664,-11.94861 -0.81822,-2.85295 -1.03283,-2.94149 -16.42808,-6.77767 -8.57947,-2.13781 -18.55216,-4.96325 -22.16153,-6.27874 -3.60938,-1.31549 -10.56283,-3.22945 -15.45213,-4.25323 -4.8893,-1.02379 -8.91716,-1.93922 -8.9508,-2.0343 -1.9098,-5.39743 -7.87619,-9.0911 -16.86129,-10.43849 -18.72336,-2.80775 -46.36556,-11.82077 -54.35244,-17.722186 -3.16954,-2.341932 -10.1638,-4.629003 -19.22709,-6.287108 -13.49683,-2.469211 -33.9527,-9.225499 -39.24832,-12.963171 -1.35873,-0.959004 -6.05637,-2.450904 -10.43918,-3.315334 -4.38281,-0.86443 -9.23438,-1.951953 -10.78125,-2.416716 -1.54687,-0.464763 -7.55019,-1.905513 -13.34071,-3.201665 C 93.531316,61.659495 87.65102,59.284738 83.304969,53.900738 81.680289,51.888041 80.618117,51.60983 56.289171,46.824579 40.278856,43.675517 34.6875,41.148706 34.6875,37.062485 c 0,-0.59248 9.092473,-3.136182 13.359375,-3.737407 8.250817,-1.162576 6.431212,-4.76911 -2.8125,-5.574494 C 26.362919,26.106357 2.9538592,21.493775 1.181809,19.070352 c -2.2061186,-3.017047 0.033589,-4.403731 8.896316,-5.50803 6.219518,-0.774955 6.933139,-3.397601 1.40625,-5.1681471 C 7.282108,7.0479731 1.875,3.1876282 1.875,1.533668 1.875,-0.40431957 23.253561,0.46144883 70.12503,4.2975921 79.045358,5.0276664 89.241907,5.625 92.784027,5.625 c 6.224954,0 47.398673,3.9864056 92.800453,8.984863 12.0949,1.331575 23.16912,2.248094 24.60938,2.036709 1.44025,-0.211384 2.61864,-0.104042 2.61864,0.238538 0,0.904685 30.30073,3.925396 32.17212,3.207273 0.86784,-0.333018 1.57788,-0.187623 1.57788,0.323099 0,0.510723 2.84766,1.207405 6.32812,1.548185 3.48047,0.340778 9.49219,1.027668 13.35938,1.526423 29.87407,3.85288 67.81511,8.108295 71.51857,8.021422 2.88871,-0.06776 4.77069,0.353247 5.28275,1.181775 0.54726,0.885486 1.92596,1.134456 4.41894,0.797991 4.53824,-0.612503 22.53372,1.404069 98.31099,11.016721 40.35021,5.118586 50.03005,6.459448 64.21875,8.895645 13.9025,2.387056 28.97463,4.754675 36.09375,5.669816 18.16415,2.334946 61.152,12.952665 79.6875,19.68229 20.29467,7.368322 53.43052,20.504959 64.04978,25.39241 3.25863,1.49977 6.15739,2.72684 6.4417,2.72684 2.14195,0 18.94012,11.08494 25.50657,16.83152 4.44624,3.8911 9.76717,8.5088 11.82427,10.26156 2.0571,1.75276 11.55221,10.82308 21.10024,20.15625 16.8126,16.43428 38.98912,37.20256 61.88864,57.95866 12.13356,10.99784 30.22998,29.30188 49.84515,50.41701 29.46486,31.718 59.00009,57.09338 70.91739,60.92911 2.9157,0.93846 10.78563,3.46672 17.48876,5.61838 l 12.1875,3.9121 10.194,-1.19025 c 9.32503,-1.08877 10.29291,-1.05509 11.35341,0.39521 1.46128,1.99845 2.71612,2.00823 4.35347,0.0339 2.23809,-2.69878 7.09567,-4.26723 9.18147,-2.96461 1.8038,1.12646 2.8701,0.85515 7.5739,-1.92708 9.877,-5.84207 32.4084,-5.86132 44.6463,-0.0382 7.2063,3.42897 6.6126,3.48676 13.1412,-1.27947 19.7125,-14.39138 51.2646,-30.49348 92.2125,-47.05929 5.9297,-2.3989 12.1106,-4.96763 13.7354,-5.70828 1.6249,-0.74067 3.23,-1.34666 3.5671,-1.34666 0.337,0 2.3827,-0.7957 4.5458,-1.76822 9.4256,-4.23769 13.0071,-5.74907 23.6204,-9.96764 15.7555,-6.26245 49.4268,-17.28041 54.6792,-17.89216 2.4108,-0.2808 8.6021,-1.61381 13.7583,-2.96223 6.4384,-1.68372 12.1648,-2.50602 18.2813,-2.62516 11.5358,-0.2247 24.3685,-1.90218 36.0937,-4.71813 5.1563,-1.23834 11.6954,-2.26544 14.5313,-2.28245 2.8359,-0.017 9.5636,-0.62048 14.9504,-1.34107 10.6009,-1.41806 35.7417,-1.14532 49.2683,0.5345 4.125,0.51226 11.2969,1.31937 15.9375,1.79356 17.921,1.83125 43.566,5.58382 61.875,9.05399 6.7032,1.27047 13.9805,2.53301 16.1719,2.80563 2.3016,0.28632 3.9844,0.99134 3.9844,1.66923 0,0.79898 2.5253,1.36765 7.9121,1.78171 22.4516,1.72577 91.8938,15.28117 108.3379,21.14799 4.3828,1.56368 9.2227,2.85484 10.7552,2.86925 l 2.7864,0.0262 -1.923,1.923 c -2.0054,2.00544 -11.5092,3.95584 -18.4847,3.79351 -1.9716,-0.0459 -4.3974,0.35147 -5.3906,0.88301 -1.9454,1.04118 -2.5066,4.65048 -0.723,4.65048 2.2018,0 -2.1383,3.48884 -5.8739,4.72168 -3.184,1.05083 -5.5033,1.0581 -13.8145,0.0433 -5.4935,-0.67076 -12.6896,-1.43774 -15.9912,-1.70438 l -6.003,-0.48481 0.6023,4.39429 0.6023,4.3943 -4.4431,1.97258 c -5.3865,2.39149 -15.0611,2.53399 -25.3378,0.37321 -7.005,-1.47286 -9.5739,-1.26461 -9.5739,0.7761 0,4.97962 -10.2729,7.28412 -29.0625,6.51954 -13.4379,-0.54682 -14.9898,-0.43481 -20.625,1.48866 -5.1421,1.75512 -8.8539,2.1596 -23.7674,2.58995 -17.0743,0.4927 -17.7672,0.58865 -20.43,2.8292 -4.3503,3.66053 -13.6102,5.01 -32.4054,4.72252 l -16.1341,-0.24677 -2.9086,2.7897 c -2.8276,2.71204 -3.2527,2.80911 -15.2722,3.48703 -27.1119,1.52915 -32.0766,2.07066 -34.6847,3.7832 -3.7519,2.46355 -16.2674,3.76213 -29.5211,3.06308 -10.5164,-0.55468 -11.6698,-0.45414 -13.125,1.14408 -1.611,1.76952 -14.6895,1.61296 -25.6892,-0.30752 -2.7448,-0.47924 -4.0943,-0.16028 -6.4656,1.52821 -1.6482,1.17362 -5.0915,2.465 -7.6518,2.86973 -2.5602,0.40473 -6.1898,1.52918 -8.0656,2.49877 -1.8758,0.9696 -4.8871,2.04953 -6.6918,2.39985 -1.8047,0.35032 -7.4547,1.96488 -12.5558,3.58793 -8.531,2.71446 -9.3659,2.82587 -10.4158,1.39003 -1.655,-2.2634 -4.9774,-1.91772 -8.675,0.90261 -4.809,3.66797 -20.2166,7.84895 -28.9246,7.84895 -4.1127,0 -8.3606,0.55917 -10.0684,1.3254 -5.8199,2.61113 -10.5428,3.71993 -16.0792,3.77494 -4.2503,0.0423 -6.3391,0.56536 -8.5475,2.14059 -5.0027,3.56845 -15.6673,6.94428 -19.8333,6.27812 -2.7504,-0.43981 -4.6492,-0.0821 -7.6267,1.43694 -4.698,2.39678 -12.6499,3.58565 -13.6085,2.03458 -0.8931,-1.44496 -3.3705,-1.32151 -5.1539,0.25683 -0.8141,0.72044 -3.3785,1.94483 -5.6988,2.72088 l -4.2188,1.41097 0.035,7.826 c 0.02,4.3043 0.3923,13.31037 0.8287,20.0135 0.8175,12.55824 -0.3674,23.21245 -4.7963,43.125 -1.3357,6.006 -8.1999,20.79491 -10.6606,22.96875 -0.2919,0.25781 -1.863,2.42745 -3.4916,4.82144 -4.7894,7.04057 -14.1288,15.02409 -31.1341,26.61428 -24.4089,16.63622 -36.77913,24.87818 -39.28066,26.17178 -5.4674,2.82729 -2.3999,6.53965 24.28066,29.38513 6.961,5.96036 14.7579,12.87222 17.3265,15.35969 2.5687,2.48748 4.9601,4.52268 5.3142,4.52268 5.4085,0 4.3932,8.89097 -1.1806,10.33847 -3.5111,0.9118 -9.0736,2.37384 -16.4717,4.32935 -4.2111,1.11309 -5.1461,1.81128 -7.0448,5.26092 -2.4718,4.4908 -7.4599,6.67633 -27.13001,11.88715 -7.23234,1.91591 -12.52275,4.08722 -19.27847,7.91232 -5.1209,2.89948 -9.58781,5.27179 -9.92634,5.27179 -0.33862,0 -2.92144,1.05468 -5.73966,2.34375 -2.81812,1.28906 -5.70318,2.34375 -6.41109,2.34375 -0.708,0 -5.90297,1.23134 -11.54447,2.73631 -5.64151,1.50498 -12.99947,3.45786 -16.35103,4.33974 -3.35156,0.88188 -9.04687,2.89716 -12.65625,4.47842 -6.31793,2.76786 -7.15643,2.88868 -22.5,3.24192 -16.788,0.38648 -18.28125,0.77322 -18.28125,4.73462 0,1.75985 -1.59516,3.93025 -5.80665,7.90058 -3.19365,3.01079 -6.46318,6.47713 -7.26562,7.70299 -0.80244,1.22586 -3.25195,4.78604 -5.44335,7.91152 -2.19141,3.12548 -3.98438,6.0945 -3.98438,6.59781 0,0.50332 -0.83938,1.36434 -1.8653,1.91339 -1.02591,0.54906 -2.46176,2.14593 -3.19078,3.54861 -1.06396,2.04711 -5.9592,7.86247 -10.6447,12.64549 -2.4196,2.46994 -8.24133,6.3111 -9.56523,6.3111 -0.86389,0 -2.78324,1.26562 -4.26524,2.8125 -2.26987,2.36924 -5.15625,3.74121 -5.15625,2.45091 z"/>' +
    '</g></g>';
  masthead.appendChild(svg);

  /* ── CSS animations ── */
  var sty = document.createElement('style');
  sty.textContent =
    '@keyframes bBank{0%,100%{transform:rotate(-3deg) scaleY(0.94)}50%{transform:rotate(3deg) scaleY(1)}}' +
    '@keyframes bPanic{0%,100%{transform:rotate(-10deg) scaleY(0.8)}50%{transform:rotate(10deg) scaleY(1.05)}}' +
    '@keyframes bWing{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.88)}}' +
    '@keyframes bCntPop{0%{transform:scale(6);opacity:0}20%{transform:scale(6);opacity:1}65%{transform:scale(1.15);opacity:0.85}82%{transform:scale(0.92)}100%{transform:scale(1);opacity:0.65}}' +
    '.b-flip{transform-box:fill-box;transform-origin:50% 50%}' +
    '.b-wing{transform-box:fill-box;transform-origin:50% 40%;animation:bWing 3s ease-in-out infinite}' +
    '.bflying{animation:bBank 5s ease-in-out infinite}' +
    '.bpanic{animation:bPanic 0.35s ease-in-out infinite!important}' +
    '.b-cnt{position:absolute;bottom:1rem;left:1.5rem;font-size:4rem;font-weight:700;color:#555;opacity:0;pointer-events:none;z-index:30;font-family:"Varela Round",sans-serif;transform-origin:bottom left}' +
    '.b-cnt-pop{animation:bCntPop 0.75s ease-out forwards}' +
    '@media(max-width:768px){.b-gull{width:60px!important;height:26px!important}}' +
    '@media(max-width:480px){.b-gull{width:44px!important;height:19px!important}}';
  document.head.appendChild(sty);

  /* ── scare counter ── */
  var scareCnt = 0;
  var countEl = document.createElement('div');
  countEl.className = 'b-cnt';
  masthead.appendChild(countEl);

  /* ── position helpers ── */
  var cx = -200, cy = -200;
  function placeAt(x, y) {
    var bs = birdSize();
    var mw = masthead.offsetWidth, mh = masthead.offsetHeight;
    x = Math.max(0, Math.min(x, mw - bs.w));
    y = Math.max(0, Math.min(y, mh - bs.h));
    svg.style.left = x + 'px'; svg.style.top = y + 'px'; cx = x; cy = y;
  }

  /* ── rAF quadratic-Bézier flight ── */
  var raf = null;
  function cancelFly() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function eio(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  function flyTo(sx, sy, ex, ey, dur, onDone) {
    cancelFly();
    svg.classList.add('bflying');
    /* cache dims and size once — avoids per-frame layout reads and object allocation */
    var mw = masthead.offsetWidth, mh = masthead.offsetHeight;
    var bs = birdSize(), bw = bs.w, bh = bs.h;
    var cpx = Math.max(0, Math.min((sx + ex) / 2 + (Math.random() - 0.5) * 160, mw - bw));
    var cpy = Math.max(0, Math.min(Math.min(sy, ey) - 20 - Math.random() * 60, mh - bh));
    var t0 = null;
    raf = requestAnimationFrame(function tick(ts) {
      if (!t0) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur), e = eio(t);
      var x = Math.max(0, Math.min((1-e)*(1-e)*sx + 2*(1-e)*e*cpx + e*e*ex, mw - bw));
      var y = Math.max(0, Math.min((1-e)*(1-e)*sy + 2*(1-e)*e*cpy + e*e*ey, mh - bh));
      svg.style.left = x + 'px'; svg.style.top = y + 'px'; cx = x; cy = y;
      if (t < 1) { raf = requestAnimationFrame(tick); }
      else { raf = null; if (onDone) onDone(); }
    });
  }

  /* ── roaming state machine ── */
  var state = 'idle', visible = false, tout = null;
  function clrT() { if (tout) { clearTimeout(tout); tout = null; } }

  var textBounds = null;
  function updateTextBounds() {
    var el = masthead.querySelector('.mx-auto.text-center') || masthead.querySelector('h1');
    if (!el) return;
    var er = el.getBoundingClientRect(), mr = masthead.getBoundingClientRect();
    textBounds = { l: er.left - mr.left, t: er.top - mr.top, r: er.right - mr.left, b: er.bottom - mr.top };
  }

  function birdSize() {
    var w = window.innerWidth;
    if (w <= 480) return { w: 44, h: 19 };
    if (w <= 768) return { w: 60, h: 26 };
    return { w: W, h: H };
  }

  function randPos() {
    var mw = masthead.offsetWidth, mh = masthead.offsetHeight;
    var bs = birdSize(), bw = bs.w, bh = bs.h;
    var navH = 70;  /* navbar height + buffer */
    var pad  = 30;  /* margin from all edges */

    if (!textBounds) updateTextBounds();
    var tb = textBounds;

    /* Zone: right half, above the title, below the navbar, with padding */
    var x0 = mw * 0.5 + pad;
    var x1 = Math.max(x0 + 1, mw - bw - pad);
    var y0 = navH;
    var y1 = tb ? Math.max(y0 + 1, tb.t - bh - pad) : mh * 0.4;

    return {
      x: x0 + Math.random() * (x1 - x0),
      y: y0 + Math.random() * Math.max(1, y1 - y0)
    };
  }

  /* Measure the pixel width of the "AI" word in the rendered h1 */
  function measureAIWord() {
    var h1 = masthead.querySelector('h1');
    if (!h1) return 100;
    var tn = h1.firstChild;
    while (tn && tn.nodeType !== 3) tn = tn.firstChild;
    if (!tn) return 100;
    try {
      var r = document.createRange();
      r.setStart(tn, tn.textContent.search(/\S/));
      r.setEnd(tn, tn.textContent.search(/\S/) + 2); // "AI"
      var w = r.getBoundingClientRect().width;
      r.detach();
      return w || 100;
    } catch (e) { return 100; }
  }

  /* Position to the LEFT of "AI": "seagull   AI" */
  function aiPos() {
    updateTextBounds();
    var tb = textBounds;
    var bs = birdSize();
    var mw = masthead.offsetWidth, mh = masthead.offsetHeight;
    var navH = 70, safeGap = 20;
    if (tb) {
      var aiW = measureAIWord();
      return {
        x: Math.max(mw * 0.5, tb.r - aiW - bs.w - safeGap + (Math.random() - 0.5) * 16),
        y: Math.max(navH, tb.t - bs.h - safeGap + (Math.random() - 0.5) * 12)
      };
    }
    return { x: mw * 0.65, y: mh * 0.2 };
  }

  /* AI → random → AI → random … */
  function goToAI() {
    if (!visible) { state = 'idle'; return; }
    state = 'flying';
    var p = aiPos();
    flyTo(cx, cy, p.x, p.y, 9000 + Math.random() * 6000, function () {
      state = 'hovering';
      clrT();
      tout = setTimeout(goRandom, 14000 + Math.random() * 10000);
    });
  }

  function goRandom() {
    if (!visible) { state = 'idle'; return; }
    state = 'flying';
    var p = randPos();
    flyTo(cx, cy, p.x, p.y, 9000 + Math.random() * 7000, function () {
      state = 'hovering';
      clrT();
      tout = setTimeout(goToAI, 14000 + Math.random() * 10000);
    });
  }

  function start() {
    if (state !== 'idle') return;
    var mw = masthead.offsetWidth, mh = masthead.offsetHeight;
    var bs = birdSize();
    var navH = 70, pad = 30;
    /* random start: right half, above title, below navbar */
    if (!textBounds) updateTextBounds();
    var tb = textBounds;
    var y1 = tb ? Math.max(navH + 1, tb.t - bs.h - pad) : mh * 0.4;
    cx = mw * 0.5 + pad + Math.random() * (mw * 0.5 - bs.w - pad * 2);
    cy = navH + Math.random() * Math.max(1, y1 - navH);
    svg.style.left = cx + 'px'; svg.style.top = cy + 'px';
    svg.classList.add('bflying');
    clrT();
    /* first move: fly above "AI" */
    tout = setTimeout(goToAI, 400 + Math.random() * 600);
  }

  function startle() {
    if (state === 'idle') return;
    clrT(); cancelFly();
    state = 'flying';
    /* increment scare counter with pop animation */
    scareCnt++;
    countEl.textContent = scareCnt;
    countEl.classList.remove('b-cnt-pop');
    void countEl.offsetWidth;
    countEl.classList.add('b-cnt-pop');
    /* panic: fast wing beat + rapid escape dart */
    svg.classList.add('bpanic');
    var p = randPos();
    flyTo(cx, cy, p.x, p.y, 600 + Math.random() * 300, function () {
      svg.classList.remove('bpanic');
      /* settle, then return to normal AI→random cycle */
      state = 'hovering';
      tout = setTimeout(goToAI, 8000 + Math.random() * 6000);
    });
  }

  svg.addEventListener('mouseenter', startle);
  svg.addEventListener('touchstart', function (e) { e.preventDefault(); startle(); }, { passive: false });

  window.addEventListener('resize', function () { textBounds = null; });

  function pause() { cancelFly(); clrT(); state = 'idle'; }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else if (visible) start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!visible) { pause(); return; }
      if (state === 'idle') start();
    }, { threshold: 0.2 }).observe(masthead);
  } else {
    visible = true;
    start();
  }
})();

// Scroll-reveal for showcase feature cards
(function () {
  var showcases = document.querySelectorAll('.showcase.js-reveal');
  if (!showcases.length) return;

  if (!('IntersectionObserver' in window)) {
    showcases.forEach(function (el) { el.classList.remove('js-reveal'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('js-reveal');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  showcases.forEach(function (el) { io.observe(el); });
})();
