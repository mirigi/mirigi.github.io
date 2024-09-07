{% include header.html %}
  <main>
<style>
.fadeout-background {
      background: white;
}

</style>

<section class="about-section bg-light">
  <div class="container">
    <div class="row no-gutters mb-4 mb-lg-5" style="overflow:hidden">
      <div class="col-xl-4 image-container">
        <img class="ximg-fluid" src="{{page.image}}" alt="" style="min-height:100%;min-width:100%;   object-fit: cover;" >
      </div>
        <div class="col-xl-8 fadeout-background" id="about">
        <div class="featured-text-right text-right text-lg-left" style="margin:2em 0 0em">
          <h1 style="padding:1em 0 0 0" >{{page.title}}</h1>
          <div class="mb-0 text-black-50">
          <p>{{ content | markdownify }}</p>

          </div>
        </div>
      </div>
    </div>
  </div>
</section>
  </main>

{% include footer.html %}
