function stageOffscreenImages(html) {
  const hero = html.indexOf('<section class="panel hero"');
  const end = hero < 0 ? -1 : html.indexOf('</section>', hero);
  if (end < 0) return html;
  const split = end + '</section>'.length;
  let count = 0;
  const tail = html.slice(split).replace(/<img\b[^>]*\bloading="lazy"[^>]*>/g, (tag) => {
    if (!/\ssrc="/.test(tag)) return tag;
    count++;
    const staged = tag.replace(/\ssrcset="([^"]*)"/, ' data-priority-srcset="$1"').replace(/\ssrc="([^"]*)"/, ' data-priority-src="$1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"');
    return staged + '<noscript>' + tag + '</noscript>';
  });
  if (!count) return html;
  const boot = `<script>(function(){function start(){var done=false;function load(){if(done)return;done=true;watch.disconnect();requestAnimationFrame(function(){requestAnimationFrame(function(){document.querySelectorAll('img[data-priority-src]').forEach(function(img){if(img.dataset.prioritySrcset){img.srcset=img.dataset.prioritySrcset;delete img.dataset.prioritySrcset}img.src=img.dataset.prioritySrc;delete img.dataset.prioritySrc})})})}var watch=new MutationObserver(check);function check(){if(document.documentElement.classList.contains('fonts-ready'))load()}watch.observe(document.documentElement,{attributes:true,attributeFilter:['class']});check();setTimeout(load,4000)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()})()</script><noscript><style>img[data-priority-src]{display:none!important}</style></noscript>`;
  return (html.slice(0, split) + tail).replace('</head>', boot + '</head>');
}
module.exports = { stageOffscreenImages };
