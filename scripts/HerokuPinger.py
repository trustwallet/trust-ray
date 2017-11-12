###################################################################################################
#
# @purpose: Sending steadily requests to Heroku so that it doesn't switch into sleeping mode
# @author: Philipp Rieger
#
# Example of usage:
# $ python3 HerokuPinger.py --url "https://test-trust-wallet-backend.herokuapp.com/"
#
###################################################################################################


import requests
import threading
import argparse


URL = None


def parse_args():
	global URL
	parser = argparse.ArgumentParser()
	parser.add_argument("--url", help="specify the URL to ping")
	args = parser.parse_args()
	URL = args.url
	print("Set URL to {}".format(URL))


def send_request():
	global URL
	print("Sending GET to {}".format(URL))
	r = requests.get(URL)
	print("Response: {}".format(r.text.encode('utf-8')))


def main():
	parse_args()
	send_request()
	threading.Timer(60.0 * 8, send_request).start()	 # call send_request every 8 min
	


if __name__ == "__main__":
	main()