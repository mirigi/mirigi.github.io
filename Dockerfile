# Use the official Ruby image as the base image
FROM ruby:latest

# Install dependencies
RUN apt-get update -qq && apt-get install -y nodejs npm

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
