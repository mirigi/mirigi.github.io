# Pin to a stable Ruby that Jekyll 4.x supports. `ruby:latest` floated to
# Ruby 4.0, which dropped logger/csv from the default gems and breaks Jekyll.
FROM ruby:3.3

# Note: Node/npm are NOT needed here. The container only runs `jekyll serve`;
# frontend assets (gulp/SCSS) are compiled on the host via `make all` and
# committed under css/. Installing nodejs+npm pulled a huge, fragile dep tree
# (gyp/node-gyp/eslint) that broke the image build, so it was removed.

# Set the working directory
WORKDIR /usr/src/app

# Copy the Gemfile and Gemfile.lock into the image
COPY Gemfile* ./

# Install the gems specified in the Gemfile
RUN gem install bundler && bundle install

# Expose port 4000 for the Jekyll server
EXPOSE 4000

# Command to run the Jekyll server
CMD ["bundle", "exec", "jekyll", "serve", "--trace", "--host", "0.0.0.0"]
