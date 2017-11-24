###################################################################################################
#
# @purpose: Constantly check if API is still up and running. If not, send out alerts.
# @author: Philipp Rieger
#
# Example of usage:
# $ python3 StatusChecker.py https://trust-wallet.herokuapp.com/ test@trust.com,test2@trust.com
#
###################################################################################################


import requests
import threading
import argparse


def parse_args():
	global URL, emails
	parser = argparse.ArgumentParser()
	parser.add_argument("url", help="specify the URL of the API")
	parser.add_argument("emails", help="specify emails that are used for alerts")
	args = parser.parse_args()
	return args.url, args.emails.split(',')


def send_alert(emails):
	# TODO: send alerts to emails
	print(emails)
	pass


def check_api_status(url, emails):
	response = requests.get(url)
	is_live = False
	# TODO: check response if API is up and running
	if not is_live:
		send_alert(emails)


def main():
	url, emails = parse_args()
	check_api_status(url, emails)
	# TODO: change to use lambda
	# threading.Timer(60.0 * 5, check_api_status).start()	 # check every 5 min


if __name__ == "__main__":
	main()
